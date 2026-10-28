#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { hasgard, hasgardAsync, until } from "./lib/hasgard.mjs";
const main = await until(
  () => hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label,
  "Test window",
);
assert.equal(
  await until(() => hasgard(main, "ipc", "plugin:app|identifier"), "Test bridge"),
  "com.nyssance.apicub.test",
);
const rpc = (cmd, payload) =>
  hasgardAsync(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
const workspaceId = await rpc("models_upsert", {
  model: { model: "workspace", name: "系统浏览器 OAuth 回归" },
});
let base;
let tokens = 0;
let protectedCalls = 0;
const browsers = [];
const redirects = new Set();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, base);
    if (url.pathname === "/authorize") {
      browsers.push(req.headers["user-agent"]);
      const redirect = new URL(url.searchParams.get("redirect_uri"));
      assert.equal(redirect.hostname, "127.0.0.1");
      assert.equal(redirect.pathname, "/callback");
      redirects.add(redirect.href);
      const params = new URLSearchParams({ state: url.searchParams.get("state") });
      if (url.searchParams.get("client_id") === "wrong-state") params.set("state", "wrong");
      if (url.searchParams.get("response_type") === "token") {
        params.set("access_token", "external-fixture-token");
        params.set("token_type", "Bearer");
        redirect.hash = params.toString();
      } else {
        params.set("code", "external-fixture-code");
        redirect.search = params.toString();
      }
      res.writeHead(302, { Location: redirect.href });
      res.end();
    } else if (url.pathname === "/token") {
      tokens++;
      let body = "";
      for await (const chunk of req) body += chunk;
      const params = new URLSearchParams(body);
      assert.equal(params.get("code"), "external-fixture-code");
      assert.ok(redirects.has(params.get("redirect_uri")));
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ access_token: "external-fixture-token", token_type: "Bearer" }));
    } else if (url.pathname === "/protected") {
      assert.equal(req.headers.authorization, "Bearer external-fixture-token");
      protectedCalls++;
      res.end("系统浏览器授权成功");
    } else {
      res.writeHead(404);
      res.end();
    }
  } catch (error) {
    res.writeHead(500);
    res.end(String(error));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
base = `http://127.0.0.1:${server.address().port}`;
try {
  for (const grantType of ["authorization_code", "implicit"]) {
    for (const mode of ["wrong-state", "success"]) {
      const beforeTokens = tokens,
        beforeProtected = protectedCalls,
        beforeBrowsers = browsers.length;
      const request = {
        model: "http_request",
        workspaceId,
        method: "GET",
        url: base + "/protected",
        authenticationType: "oauth2",
        authentication: {
          grantType,
          responseType: "token",
          authorizationUrl: base + "/authorize",
          accessTokenUrl: base + "/token",
          clientId: mode,
          credentials: "body",
          headerPrefix: "Bearer",
          useExternalBrowser: true,
          callbackType: "localhost",
          callbackPort: "0",
        },
      };
      request.id = await rpc("models_upsert", { model: request });
      const outcome = await rpc("cmd_send_ephemeral_request", {
        request,
        environmentId: null,
        cookieJarId: null,
      }).then(
        (result) => ({ result }),
        (error) => ({ error }),
      );
      assert.equal(browsers.length, beforeBrowsers + 1, "system browser reached provider");
      assert.match(browsers.at(-1), /Mozilla/);
      if (mode === "success") {
        assert.equal(outcome.result?.response.status, 200);
        assert.equal(protectedCalls, beforeProtected + 1);
        assert.equal(tokens, beforeTokens + (grantType === "authorization_code" ? 1 : 0));
      } else {
        assert.ok(outcome.error || outcome.result?.response.error, "invalid state must reject");
        assert.equal(tokens, beforeTokens);
        assert.equal(protectedCalls, beforeProtected);
      }
      assert.ok(
        !hasgard(null, "windows").windows.some((w) => w.label === "oauth-authorization-url"),
        "no embedded OAuth window",
      );
      console.log("PASS: system browser", grantType, mode);
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
