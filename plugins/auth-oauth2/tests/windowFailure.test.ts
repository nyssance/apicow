import { expect, test } from "vite-plus/test";
import { getAuthorizationCode } from "../src/grants/authorizationCode";
import { getImplicit } from "../src/grants/implicit";
const args = {
  authorizationUrl: "https://auth.example.test/authorize",
  accessTokenUrl: "https://auth.example.test/token",
  redirectUri: "https://app.example.test/callback",
  clientId: "fixture",
  clientSecret: "fixture",
  scope: null,
  state: null,
  audience: null,
  credentialsInBody: true,
  pkce: null,
  tokenName: "access_token" as const,
  responseType: "token",
};
for (const grant of [getAuthorizationCode, getImplicit]) {
  test(`${grant.name} rejects a failed window opening instead of leaving authorization pending`, async () => {
    const ctx = {
      store: { get: async () => undefined },
      window: {
        openUrl: async () => {
          throw new Error("fixture window failure");
        },
      },
    } as never;
    await expect(grant(ctx, "request", args)).rejects.toThrow("fixture window failure");
  });
}
