import { randomBytes } from "node:crypto";
import type { Context } from "@yaakapp/api";
import { getRedirectUrlViaExternalBrowser } from "../callbackServer";
import type { CustomParams } from "../customParams";
import { applyQueryParams, NO_CUSTOM_PARAMS } from "../customParams";
import type { AccessToken, AccessTokenRawResponse } from "../store";
import { getDataDirKey, getToken, storeToken } from "../store";
import { isTokenExpired, urlMatchesRedirect, validateOAuthState } from "../util";
import type { ExternalBrowserOptions } from "./authorizationCode";

export async function getImplicit(
  ctx: Context,
  contextId: string,
  {
    authorizationUrl: authorizationUrlRaw,
    responseType,
    clientId,
    redirectUri,
    scope,
    state,
    audience,
    tokenName,
    externalBrowser,
    customParams = NO_CUSTOM_PARAMS,
  }: {
    authorizationUrl: string;
    responseType: string;
    clientId: string;
    redirectUri: string | null;
    scope: string | null;
    state: string | null;
    audience: string | null;
    tokenName: "access_token" | "id_token";
    externalBrowser?: ExternalBrowserOptions;
    customParams?: CustomParams;
  },
): Promise<AccessToken> {
  const tokenArgs = {
    contextId,
    clientId,
    accessTokenUrl: null,
    authorizationUrl: authorizationUrlRaw,
  };
  const token = await getToken(ctx, tokenArgs);
  if (token != null && !isTokenExpired(token, tokenName)) {
    return token;
  }

  let authorizationUrl: URL;
  try {
    authorizationUrl = new URL(`${authorizationUrlRaw ?? ""}`);
  } catch {
    throw new Error(`Invalid authorization URL "${authorizationUrlRaw}"`);
  }
  authorizationUrl.searchParams.set("response_type", responseType);
  authorizationUrl.searchParams.set("client_id", clientId);
  if (scope) authorizationUrl.searchParams.set("scope", scope);
  if (state) authorizationUrl.searchParams.set("state", state);
  if (audience) authorizationUrl.searchParams.set("audience", audience);
  if (responseType.includes("id_token")) {
    authorizationUrl.searchParams.set(
      "nonce",
      String(Math.floor(Math.random() * 9999999999999) + 1),
    );
  }

  // Applied before redirect_uri, which belongs to the callback flow rather than
  // to the user: overriding it would send the token somewhere nothing listens
  applyQueryParams(authorizationUrl, customParams.authorizationQuery);

  const expectedState =
    authorizationUrl.searchParams.get("state") || randomBytes(32).toString("base64url");
  authorizationUrl.searchParams.set("state", expectedState);

  let newToken: AccessToken;

  // Use external browser flow if enabled
  if (externalBrowser?.useExternalBrowser) {
    const result = await getRedirectUrlViaExternalBrowser(ctx, authorizationUrl, {
      callbackType: externalBrowser.callbackType,
      callbackPort: externalBrowser.callbackPort,
    });
    newToken = await extractImplicitToken(
      ctx,
      result.callbackUrl,
      tokenArgs,
      tokenName,
      expectedState,
    );
  } else {
    // Use embedded browser flow (original behavior)
    if (redirectUri) {
      authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    }
    newToken = await getTokenViaEmbeddedBrowser(
      ctx,
      contextId,
      authorizationUrl,
      tokenArgs,
      tokenName,
      redirectUri,
      expectedState,
    );
  }

  return newToken;
}

/**
 * Get token using the embedded browser window.
 * This is the original flow that monitors navigation events.
 */
async function getTokenViaEmbeddedBrowser(
  ctx: Context,
  contextId: string,
  authorizationUrl: URL,
  tokenArgs: {
    contextId: string;
    clientId: string;
    accessTokenUrl: null;
    authorizationUrl: string;
  },
  tokenName: "access_token" | "id_token",
  redirectUri: string | null,
  expectedState: string,
): Promise<AccessToken> {
  const dataDirKey = await getDataDirKey(ctx, contextId);
  const authorizationUrlStr = authorizationUrl.toString();
  console.log("[oauth2] Authorizing via embedded browser (implicit)", authorizationUrlStr);

  return new Promise<AccessToken>((resolve, reject) => {
    let closeWindow: (() => void) | undefined;
    let closeRequested = false;
    const close = () => {
      closeRequested = true;
      closeWindow?.();
    };
    let foundAccessToken = false;
    void ctx.window
      .openUrl({
        dataDirKey,
        url: authorizationUrlStr,
        label: "oauth-authorization-url",
        async onClose() {
          if (!foundAccessToken) {
            reject(new Error("Authorization window closed"));
          }
        },
        async onNavigate({ url: urlStr }) {
          const url = new URL(urlStr);
          if (!urlMatchesRedirect(url, redirectUri)) return;
          const hashParams = new URLSearchParams(url.hash.slice(1));
          if (
            !hashParams.has(tokenName) &&
            !url.searchParams.has(tokenName) &&
            !hashParams.has("error") &&
            !url.searchParams.has("error")
          )
            return;
          try {
            const token = await extractImplicitToken(
              ctx,
              urlStr,
              tokenArgs,
              tokenName,
              expectedState,
            );
            foundAccessToken = true;
            close();
            resolve(token);
          } catch (err) {
            reject(err);
            close();
          }
        },
      })
      .then((handle) => {
        closeWindow = () => {
          handle.close();
        };
        if (closeRequested) close();
      }, reject);
  });
}

/**
 * Extract the implicit grant token from a callback URL and store it.
 */
async function extractImplicitToken(
  ctx: Context,
  callbackUrl: string,
  tokenArgs: {
    contextId: string;
    clientId: string;
    accessTokenUrl: null;
    authorizationUrl: string;
  },
  tokenName: "access_token" | "id_token",
  expectedState: string,
): Promise<AccessToken> {
  const url = new URL(callbackUrl);

  const hash = new URLSearchParams(url.hash.slice(1));
  const params = hash.has(tokenName) || hash.has("error") ? hash : url.searchParams;
  validateOAuthState(params, expectedState);
  if (params.has("error")) {
    throw new Error(`Failed to authorize: ${params.get("error")}`);
  }
  if (!params.get(tokenName)) throw new Error(`No ${tokenName} found in callback URL`);
  const response: AccessTokenRawResponse = {
    access_token: params.get("access_token") ?? "",
    token_type: params.get("token_type") ?? undefined,
    expires_in: params.has("expires_in")
      ? parseInt(params.get("expires_in") ?? "0", 10)
      : undefined,
    scope: params.get("scope") ?? undefined,
  };
  const idToken = params.get("id_token");
  if (idToken) response.id_token = idToken;
  return storeToken(ctx, tokenArgs, response, tokenName);
}
