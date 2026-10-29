#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createTcpServer, connect } from "node:net";
import { hasgard, hasgardAsync } from "./lib/hasgard.mjs";
const main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
assert.ok(main);
assert.equal(hasgard(main, "ipc", "plugin:app|identifier"), "day.dreamer.apicow.test");
const rpc = (cmd, payload) =>
  hasgardAsync(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
const saved = await rpc("models_get_settings", {});
const workspaceId = await rpc("models_upsert", {
  model: { model: "workspace", name: "OAuth 浏览器与 SOCKS 回归" },
});
const sockets = new Set();
const seen = { authorize: [], token: [], protected: [], socks: [] };
const verifier = "apicow-local-pkce-verifier-abcdefghijklmnopqrstuvwxyz0123456789";
let base;
const http = createServer((req, res) => {
  const url = new URL(req.url, base);
  if (url.pathname === "/authorize") {
    seen.authorize.push(Object.fromEntries(url.searchParams));
    const callback = new URL(url.searchParams.get("redirect_uri"));
    if (url.searchParams.get("client_id") === "denied")
      callback.searchParams.set("error", "access_denied");
    else callback.searchParams.set("code", "dummy-authorization-code");
    callback.searchParams.set("state", url.searchParams.get("state"));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      `<html><body>本机授权测试<script>setTimeout(()=>location.href=${JSON.stringify(callback.href)},200)</script></body></html>`,
    );
  } else if (url.pathname === "/token") {
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", () => {
      const form = Object.fromEntries(new URLSearchParams(body));
      seen.token.push(form);
      res.setHeader("Content-Type", "application/json");
      if (form.code !== "dummy-authorization-code" || form.code_verifier !== verifier) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "invalid_grant" }));
        return;
      }
      res.end(
        JSON.stringify({
          access_token: "dummy-browser-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );
    });
  } else if (url.pathname === "/protected") {
    seen.protected.push({
      authorization: req.headers.authorization,
      proxy: req.headers["proxy-authorization"],
    });
    res.end("原始中文 Settings");
  } else res.end("callback");
});
const socks = createTcpServer((socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => {});
  let buffer = Buffer.alloc(0),
    phase = "greeting";
  const onData = (data) => {
    buffer = Buffer.concat([buffer, data]);
    if (phase === "greeting") {
      if (buffer.length < 2 || buffer.length < 2 + buffer[1]) return;
      assert.equal(buffer[0], 5);
      assert.ok(buffer.subarray(2, 2 + buffer[1]).includes(2));
      buffer = buffer.subarray(2 + buffer[1]);
      socket.write(Buffer.from([5, 2]));
      phase = "auth";
    }
    if (phase === "auth") {
      if (buffer.length < 2 || buffer.length < 3 + buffer[1]) return;
      const userEnd = 2 + buffer[1],
        passEnd = userEnd + 1 + buffer[userEnd];
      if (buffer.length < passEnd) return;
      const user = buffer.subarray(2, userEnd).toString(),
        password = buffer.subarray(userEnd + 1, passEnd).toString();
      seen.socks.push({ user, password });
      buffer = buffer.subarray(passEnd);
      if (user !== "socks-user" || password !== "dummy-pass") {
        socket.end(Buffer.from([1, 1]));
        return;
      }
      socket.write(Buffer.from([1, 0]));
      phase = "connect";
    }
    if (phase === "connect") {
      if (buffer.length < 5) return;
      assert.equal(buffer[0], 5);
      assert.equal(buffer[1], 1);
      const type = buffer[3];
      const end = type === 1 ? 8 : type === 3 ? 5 + buffer[4] : null;
      assert.ok(end, "IPv4 or domain target");
      if (buffer.length < end + 2) return;
      const host =
        type === 1
          ? Array.from(buffer.subarray(4, 8)).join(".")
          : buffer.subarray(5, end).toString();
      const port = buffer.readUInt16BE(end);
      assert.equal(host, "127.0.0.1");
      assert.equal(port, http.address().port);
      const extra = buffer.subarray(end + 2);
      phase = "tunnel";
      socket.removeListener("data", onData);
      const upstream = connect(port, host, () => {
        socket.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]));
        if (extra.length) upstream.write(extra);
        socket.pipe(upstream);
        upstream.pipe(socket);
      });
      sockets.add(upstream);
      upstream.on("close", () => sockets.delete(upstream));
      upstream.on("error", () => socket.destroy());
    }
  };
  socket.on("data", onData);
});
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  await listen(http);
  base = `http://127.0.0.1:${http.address().port}`;
  let request = {
    model: "http_request",
    workspaceId,
    name: "内嵌浏览器 PKCE",
    method: "GET",
    url: base + "/protected",
    authenticationType: "oauth2",
    authentication: {
      grantType: "authorization_code",
      authorizationUrl: base + "/authorize",
      accessTokenUrl: base + "/token",
      redirectUri: base + "/callback",
      clientId: "dummy-browser-client",
      clientSecret: "dummy-secret",
      scope: "read",
      state: "dummy-state",
      credentials: "body",
      headerPrefix: "Bearer",
      usePkce: true,
      pkceChallengeMethod: "S256",
      pkceCodeVerifier: verifier,
    },
  };
  request.id = await rpc("models_upsert", { model: request });
  const send = (request) =>
    rpc("cmd_send_ephemeral_request", { request, environmentId: null, cookieJarId: null });
  const result = await send(request);
  assert.equal(result.response.status, 200);
  assert.equal(Buffer.from(result.body).toString(), "原始中文 Settings");
  assert.equal(seen.authorize.length, 1);
  assert.equal(
    seen.authorize[0].code_challenge,
    createHash("sha256").update(verifier).digest("base64url"),
  );
  assert.equal(seen.authorize[0].code_challenge_method, "S256");
  assert.equal(seen.authorize[0].state, "dummy-state");
  assert.equal(seen.token.length, 1);
  assert.equal(seen.token[0].grant_type, "authorization_code");
  assert.equal(seen.token[0].redirect_uri, base + "/callback");
  assert.equal(seen.protected[0].authorization, "Bearer dummy-browser-token");
  assert.equal((await send(request)).response.status, 200);
  assert.equal(seen.authorize.length, 1);
  assert.equal(seen.token.length, 1);
  const denied = {
    ...request,
    id: undefined,
    authentication: { ...request.authentication, clientId: "denied" },
  };
  denied.id = await rpc("models_upsert", { model: denied });
  await assert.rejects(send(denied));
  assert.equal(seen.authorize.length, 2);
  assert.equal(seen.token.length, 1);
  assert.equal(seen.protected.length, 2);
  console.log(
    "PASS: embedded OAuth authorization page/navigation, PKCE S256, code exchange, cache and authorization denial",
  );
  await listen(socks);
  const proxyUrl = `socks5h://127.0.0.1:${socks.address().port}`;
  const proxy = {
    type: "enabled",
    http: proxyUrl,
    https: proxyUrl,
    auth: { user: "socks-user", password: "dummy-pass" },
    bypass: "",
    disabled: false,
  };
  await rpc("models_upsert", { model: { ...saved, proxy } });
  const plain = { ...request, authenticationType: null, authentication: {} };
  const proxied = await send(plain);
  assert.equal(proxied.response.status, 200);
  assert.equal(Buffer.from(proxied.body).toString(), "原始中文 Settings");
  assert.deepEqual(seen.socks, [{ user: "socks-user", password: "dummy-pass" }]);
  assert.equal(seen.protected.at(-1).proxy, undefined);
  await rpc("models_upsert", {
    model: { ...saved, proxy: { ...proxy, auth: { user: "socks-user", password: "wrong" } } },
  });
  await assert.rejects(send(plain));
  assert.equal(seen.socks.at(-1).password, "wrong");
  assert.equal(seen.protected.length, 3);
  console.log(
    "PASS: SOCKS5 authentication, exact response, rejected credentials and credential isolation",
  );
} finally {
  try {
    await rpc("models_upsert", { model: saved });
  } finally {
    for (const socket of sockets) socket.destroy();
    http.closeAllConnections();
    await Promise.all([new Promise((r) => http.close(r)), new Promise((r) => socks.close(r))]);
  }
}
