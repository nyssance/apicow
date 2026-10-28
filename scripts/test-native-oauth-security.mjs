#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { hasgard, hasgardAsync, until } from "./lib/hasgard.mjs";
const main = await until(
  () => hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label,
  "Test window ready",
);
assert.equal(
  await until(() => hasgard(main, "ipc", "plugin:app|identifier"), "Test bridge ready"),
  "com.nyssance.apicub.test",
);
const rpc = (cmd, payload) =>
  hasgardAsync(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
const workspaceId = await rpc("models_upsert", {
  model: { model: "workspace", name: "OAuth 安全边界" },
});
let base;
let foreignPort;
let tokens = 0;
let protectedCalls = 0;
const visited = [];
const modes = new Map();
const server = createServer((req, res) => {
  const url = new URL(req.url, base);
  visited.push(url.pathname);
  if (url.pathname === "/authorize") {
    const clientId = url.searchParams.get("client_id");
    const mode = modes.get(clientId) ?? clientId;
    const cb = new URL(url.searchParams.get("redirect_uri"));
    const p = new URLSearchParams({ state: url.searchParams.get("state") });
    if (url.searchParams.get("response_type") === "token") {
      p.set("access_token", "dummy-token");
      p.set("token_type", "Bearer");
    } else p.set("code", "dummy-code");
    if (mode === "wrong-state") p.set("state", "wrong-state");
    if (mode === "missing-state") p.delete("state");
    if (mode === "wrong-path") cb.pathname = "/wrong";
    if (mode === "wrong-origin") {
      cb.port = String(foreignPort);
      cb.pathname = "/foreign";
    }
    if (mode === "duplicate-state") p.append("state", "fixture-state");
    if (url.searchParams.get("response_type") === "token") cb.hash = p.toString();
    else cb.search = p.toString();
    res.setHeader("Content-Type", "text/html");
    res.end(
      mode === "close"
        ? "Close this test window"
        : `<script>setTimeout(()=>location.href=${JSON.stringify(cb.href)},150)</script>`,
    );
  } else if (url.pathname === "/token") {
    tokens++;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ access_token: "dummy-token", token_type: "Bearer" }));
  } else if (url.pathname === "/protected") {
    protectedCalls++;
    res.end("ok");
  } else res.end("callback fixture");
});
const foreign = createServer((req, res) => {
  visited.push("/foreign");
  res.end("foreign callback fixture");
});
await new Promise((r) => foreign.listen(0, "127.0.0.1", r));
foreignPort = foreign.address().port;
await new Promise((r) => server.listen(0, "127.0.0.1", r));
base = `http://127.0.0.1:${server.address().port}`;
try {
  for (const grantType of ["authorization_code", "implicit"]) {
    for (const mode of [
      "wrong-state",
      "missing-state",
      "duplicate-state",
      "wrong-path",
      "wrong-origin",
      "close",
      "success",
    ]) {
      modes.delete(mode);
      const beforeTokens = tokens,
        beforeProtected = protectedCalls;
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
          redirectUri: base + "/callback",
          clientId: mode,
          state: "fixture-state",
          credentials: "body",
          headerPrefix: "Bearer",
        },
      };
      request.id = await rpc("models_upsert", { model: request });
      const pending = rpc("cmd_send_ephemeral_request", {
        request,
        environmentId: null,
        cookieJarId: null,
      }).then(
        (result) => ({ result }),
        (error) => ({ error }),
      );
      if (["wrong-path", "wrong-origin", "close"].includes(mode)) {
        const expected =
          mode === "wrong-path" ? "/wrong" : mode === "wrong-origin" ? "/foreign" : "/authorize";
        const before = visited.length;
        await until(
          () =>
            visited.slice(before).includes(expected) ||
            (mode === "close" && visited.at(-1) === "/authorize"),
          "test authorization navigation",
        );
        assert.equal(tokens, beforeTokens);
        assert.equal(protectedCalls, beforeProtected);
        await hasgardAsync(
          main,
          "ipc",
          "plugin:window|close",
          "--args",
          JSON.stringify({ label: "oauth-authorization-url" }),
        );
      }
      const outcome = await pending;
      if (mode === "success") {
        assert.equal(outcome.result?.response.status, 200);
        assert.equal(protectedCalls, beforeProtected + 1);
      } else {
        assert.ok(
          outcome.error || outcome.result?.response.error,
          `${grantType} ${mode} must reject`,
        );
        assert.equal(tokens, beforeTokens);
        assert.equal(protectedCalls, beforeProtected);
        modes.set(mode, "success");
        const retry = await rpc("cmd_send_ephemeral_request", {
          request,
          environmentId: null,
          cookieJarId: null,
        });
        assert.equal(
          retry.response.status,
          200,
          "same request recovers after rejection/cancellation",
        );
        assert.equal(protectedCalls, beforeProtected + 1);
        assert.equal(tokens, beforeTokens + (grantType === "authorization_code" ? 1 : 0));
      }
      console.log("PASS:", grantType, mode);
    }
  }
} finally {
  server.closeAllConnections();
  foreign.closeAllConnections();
  await Promise.all([new Promise((r) => server.close(r)), new Promise((r) => foreign.close(r))]);
}
