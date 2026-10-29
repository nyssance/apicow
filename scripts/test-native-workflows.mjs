#!/usr/bin/env node
import assert from "node:assert/strict";
import * as grpc from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { hasgard, hasgardAsync, evaluate, until, clickText } from "./lib/hasgard.mjs";
const requireRuntime = createRequire(
  new URL("../packages/plugin-runtime/package.json", import.meta.url),
);
const { WebSocketServer } = requireRuntime("ws");
const main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
assert.ok(main);
assert.equal(hasgard(main, "ipc", "plugin:app|identifier"), "day.dreamer.apicow.test");
assert.equal(evaluate(main, "document.documentElement.lang"), "zh-CN", "Run test:hasgard first");
const received = [];
const server = createServer((req, res) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    received.push({ url: req.url, method: req.method, headers: req.headers, body });
    if (req.url === "/redirect") {
      res.writeHead(302, { Location: "/cookie", "Set-Cookie": "apicow_test=local-safe; Path=/" });
      // Cookie header values must be ASCII; the payload checks cover Unicode.
      res.end();
    } else if (req.url === "/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end('id: 1\nevent: message\ndata: {"text":"中文 SSE"}\n\nid: 2\ndata: complete\n\n');
    } else {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
    }
  });
});
const ws = new WebSocketServer({ server });
const wsMessages = [];
ws.on("connection", (socket) =>
  socket.on("message", (data) => {
    wsMessages.push(data.toString());
    socket.send(data);
  }),
);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let tlsServer;
const grpcServer = new grpc.Server();
const dir = await mkdtemp(join(tmpdir(), "apicow-workflows-"));
function rpc(cmd, payload) {
  return hasgard(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
}
function workspaceId() {
  return evaluate(main, 'location.pathname.split("/")[2]');
}
async function importFile(path) {
  const before = workspaceId();
  hasgard(main, "click", 'button[title="主菜单"]');
  clickText(main, "导入数据");
  await until(() => evaluate(main, '!!document.querySelector("[role=dialog]")'), "import dialog");
  await until(
    () =>
      evaluate(
        main,
        'Array.from(document.querySelectorAll("[role=dialog] button")).some(e => e.textContent.trim() === "预览导入")',
      ),
    "source loaded",
  );
  while (evaluate(main, '!!document.querySelector("[role=dialog] button[title^=移除]")')) {
    hasgard(main, "click", "[role=dialog] button[title^=移除]");
  }
  await until(
    () =>
      evaluate(
        main,
        'Array.from(document.querySelectorAll("[role=dialog] button")).some(e => e.textContent.trim() === "URL")',
      ),
    "import source",
  );
  clickText(main, "URL");
  hasgard(main, "fill", '[role="dialog"] input', path);
  clickText(main, "添加");
  await until(
    () =>
      evaluate(
        main,
        'Array.from(document.querySelectorAll("[role=dialog] button")).some(e => e.textContent.trim() === "预览导入" && !e.disabled)',
      ),
    "format detection",
  );
  clickText(main, "预览导入");
  await until(
    () =>
      evaluate(
        main,
        'Array.from(document.querySelectorAll("[role=dialog] button")).some(e => e.textContent.startsWith("应用 "))',
      ),
    "preview",
  );
  assert.equal(
    evaluate(main, 'document.querySelector("[role=dialog]").innerText.includes("Changes")'),
    false,
    "localized import action",
  );
  evaluate(
    main,
    'Array.from(document.querySelectorAll("[role=dialog] button")).find(e => e.textContent.startsWith("应用 ")).click()',
  );
  await until(() => workspaceId() !== before, "import committed");
  await until(
    () =>
      evaluate(
        main,
        'Array.from(document.querySelectorAll("[role=dialog] button")).some(e => e.textContent.trim() === "完成")',
      ),
    "import summary",
  );
  assert.equal(
    evaluate(
      main,
      '/\\b(Workspaces?|Environments?|Requests?)\\b/.test(document.querySelector("[role=dialog]").innerText)',
    ),
    false,
    "localized import summary",
  );
  clickText(main, "完成");
  return workspaceId();
}
async function send(name, path, editorUrl = base + path) {
  evaluate(
    main,
    `(() => {
    const e = Array.from(document.querySelectorAll('aside button,[role="complementary"] button')).find(e => e.textContent.includes(${JSON.stringify(name)}));
    if (!e) throw new Error('request not found'); e.click(); return true;
  })()`,
  );
  await until(
    () =>
      evaluate(
        main,
        `document.querySelector('form .cm-content')?.cmTile.view.state.doc.toString() === ${JSON.stringify(editorUrl)}`,
      ),
    "selected request",
  );
  const count = received.length;
  hasgard(main, "click", 'button[title="发送请求 ⌘↩︎"]');
  await until(() => received.length > count, name);
  await until(() => evaluate(main, 'document.body.innerText.includes("200 OK")'), "response");
  return received.slice(count);
}
try {
  const fixtures = [
    {
      name: "基础认证 中文",
      path: "/basic",
      auth: {
        type: "basic",
        basic: [
          { key: "username", value: "user" },
          { key: "password", value: "pass:中文" },
        ],
      },
    },
    {
      name: "令牌认证 中文",
      path: "/bearer",
      auth: { type: "bearer", bearer: [{ key: "token", value: "local-test-token" }] },
    },
    {
      name: "API Key 中文",
      path: "/key",
      auth: {
        type: "apikey",
        apikey: [
          { key: "key", value: "X-ApiCow-Key" },
          { key: "value", value: "local-key" },
          { key: "in", value: "header" },
        ],
      },
    },
    {
      name: "JSON 请求 中文",
      path: "/json",
      method: "POST",
      body: {
        mode: "raw",
        raw: JSON.stringify({ Name: "Send 中文", value: "Settings" }),
        options: { raw: { language: "json" } },
      },
    },
    { name: "重定向 Cookie", path: "/redirect" },
    { name: "事件流 中文", path: "/events" },
  ];
  const postman = {
    info: {
      name: "ApiCow 原生回归",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: fixtures.map((f) => ({
      name: f.name,
      request: { method: f.method ?? "GET", url: base + f.path, auth: f.auth, body: f.body },
    })),
  };
  const file = join(dir, "collection.json");
  await writeFile(file, JSON.stringify(postman));
  const id = await importFile(file);
  const exported = JSON.parse(
    rpc("cmd_export_data", { workspaceIds: [id], includePrivateEnvironments: true }),
  );
  assert.equal(exported.resources.httpRequests.length, fixtures.length);
  assert.equal(
    (await send(fixtures[0].name, "/basic"))[0].headers.authorization,
    `Basic ${Buffer.from("user:pass:中文").toString("base64")}`,
  );
  assert.equal(
    (await send(fixtures[1].name, "/bearer"))[0].headers.authorization,
    "Bearer local-test-token",
  );
  assert.equal((await send(fixtures[2].name, "/key"))[0].headers["x-apicow-key"], "local-key");
  assert.equal((await send(fixtures[3].name, "/json"))[0].body, fixtures[3].body.raw);
  const redirect = await send(fixtures[4].name, "/redirect");
  await until(() => received.at(-1)?.url === "/cookie", "redirect followed");
  assert.equal(received.at(-1).headers.cookie, "apicow_test=local-safe");
  assert.equal(redirect[0].url, "/redirect");
  await send(fixtures[5].name, "/events");
  await until(
    () =>
      evaluate(
        main,
        'document.body.innerText.includes("中文 SSE") && document.body.innerText.includes("complete")',
      ),
    "SSE events rendered",
  );
  const roundtripFile = join(dir, "roundtrip.json");
  await writeFile(roundtripFile, JSON.stringify(exported));
  const roundtripId = await importFile(roundtripFile);
  const roundtrip = JSON.parse(
    rpc("cmd_export_data", { workspaceIds: [roundtripId], includePrivateEnvironments: true }),
  );
  const semantic = (doc) =>
    doc.resources.httpRequests
      .map(
        ({
          name,
          method,
          url,
          body,
          bodyType,
          authentication,
          authenticationType,
          headers,
          urlParameters,
        }) => ({
          name,
          method,
          url,
          body,
          bodyType,
          authentication,
          authenticationType,
          headers: headers.map(({ name, value, enabled }) => ({ name, value, enabled })),
          urlParameters: urlParameters.map(({ name, value, enabled }) => ({
            name,
            value,
            enabled,
          })),
        }),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(semantic(roundtrip), semantic(exported));
  hasgard(main, "click", 'button[title="添加资源"]');
  clickText(main, "WebSocket");
  await until(
    () =>
      evaluate(
        main,
        '!!document.querySelector("form .cm-content") && document.body.innerText.includes("消息")',
      ),
    "WebSocket editor",
  );
  const wsUrl = base.replace("http:", "ws:") + "/socket";
  const message = "中文 WebSocket — Settings";
  evaluate(
    main,
    `(() => {
    const view = document.querySelector('form .cm-content').cmTile.view;
    view.dispatch({changes:{from:0,to:view.state.doc.length,insert:${JSON.stringify(wsUrl)}}});
    const editor = Array.from(document.querySelectorAll('.cm-content')).find(e=>e.getBoundingClientRect().height>100 && e.cmTile.view.state.doc.length===0).cmTile.view;
    editor.dispatch({changes:{from:0,to:0,insert:${JSON.stringify(message)}}}); return true;
  })()`,
  );
  hasgard(main, "click", 'button[title="发送请求 ⌘↩︎"]');
  await until(() => ws.clients.size === 1, "WebSocket handshake");
  await until(
    () => evaluate(main, '!!document.querySelector("button[title=关闭连接]")'),
    "connected controls",
  );
  hasgard(main, "click", 'button[title="发送请求 ⌘↩︎"]');
  await until(() => wsMessages.length === 1, "WebSocket message");
  assert.equal(wsMessages[0], message);
  assert.ok(evaluate(main, 'document.body.innerText.includes("已连接服务器")'));
  await until(
    () => evaluate(main, `document.body.innerText.split(${JSON.stringify(message)}).length >= 3`),
    "WebSocket sent and received",
  );
  hasgard(main, "click", 'button[title="关闭连接"]');
  await until(() => ws.clients.size === 0, "WebSocket close");
  await until(
    () => evaluate(main, 'document.body.innerText.includes("已断开服务器连接")'),
    "localized closed event",
  );
  const openapiFile = join(dir, "openapi.json");
  await writeFile(
    openapiFile,
    JSON.stringify({
      openapi: "3.0.3",
      info: { title: "OpenAPI 中文回归", version: "1" },
      servers: [{ url: base }],
      paths: {
        "/openapi": {
          post: {
            summary: "OpenAPI 中文请求",
            requestBody: {
              content: {
                "application/json": { schema: { type: "object" }, example: { Name: "Send 中文" } },
              },
            },
            responses: { 200: { description: "回显" } },
          },
        },
      },
    }),
  );
  await importFile(openapiFile);
  clickText(main, "Global Variables");
  clickText(main, "Server 1");
  assert.equal(
    (await send("OpenAPI 中文请求", "/openapi", "${[baseUrl]}/openapi"))[0].method,
    "POST",
  );
  assert.deepEqual(JSON.parse(received.at(-1).body), { Name: "Send 中文" });
  const protoFile = join(dir, "echo.proto");
  await writeFile(
    protoFile,
    'syntax = "proto3"; package apicow; service Echo { rpc Unary (Message) returns (Message); rpc Stream (Message) returns (stream Message); } message Message { string text = 1; }',
  );
  const definition = grpc.loadPackageDefinition(loadSync(protoFile));
  const grpcRequests = [];
  grpcServer.addService(definition.apicow.Echo.service, {
    Unary(call, callback) {
      grpcRequests.push(call.request);
      callback(null, call.request);
    },
    Stream(call) {
      grpcRequests.push(call.request);
      call.write(call.request);
      call.write({ text: "第二条消息" });
      call.end();
    },
  });
  const grpcPort = await new Promise((resolve, reject) =>
    grpcServer.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, port) =>
      error ? reject(error) : resolve(port),
    ),
  );
  const grpcFile = join(dir, "grpc.json");
  const resources = Object.fromEntries(Object.keys(exported.resources).map((key) => [key, []]));
  resources.workspaces = [
    { ...exported.resources.workspaces[0], id: "wk_grpc_fixture", name: "gRPC 中文回归" },
  ];
  resources.grpcRequests = ["Unary", "Stream"].map((method) => ({
    model: "grpc_request",
    id: "gr_fixture_" + method,
    workspaceId: "wk_grpc_fixture",
    name: method + " 中文",
    url: `http://127.0.0.1:${grpcPort}`,
    service: "apicow.Echo",
    method,
    message: JSON.stringify({ text: "原始中文 Settings" }),
  }));
  await writeFile(grpcFile, JSON.stringify({ ...exported, resources }));
  const grpcWorkspace = await importFile(grpcFile);
  const importedGrpc = JSON.parse(
    rpc("cmd_export_data", { workspaceIds: [grpcWorkspace], includePrivateEnvironments: true }),
  ).resources.grpcRequests;
  for (const request of importedGrpc) {
    const payload = { requestId: request.id, environmentId: null, protoFiles: [protoFile] };
    const services = await hasgardAsync(
      main,
      "ipc",
      "rpc",
      "--args",
      JSON.stringify({ cmd: "cmd_grpc_reflect", payload }),
    );
    assert.ok(services.some((service) => service.name === "apicow.Echo"));
    const connectionId = await hasgardAsync(
      main,
      "ipc",
      "rpc",
      "--args",
      JSON.stringify({ cmd: "cmd_grpc_go", payload }),
    );
    await until(
      () =>
        rpc("models_grpc_events", { connectionId }).some(
          (event) => event.eventType === "connection_end",
        ),
      "gRPC finished",
    );
    const events = rpc("models_grpc_events", { connectionId });
    // GrpcEvent::order_by returns CreatedAt DESC; compare in wire order.
    const texts = events
      .filter((event) => event.eventType === "server_message")
      .reverse()
      .map((event) => JSON.parse(event.content).text);
    assert.equal(events.find((event) => event.eventType === "connection_end").status, 0);
    assert.deepEqual(
      texts,
      request.method === "Unary" ? ["原始中文 Settings"] : ["原始中文 Settings", "第二条消息"],
    );
  }
  assert.equal(grpcRequests.length, 2);
  const keyFile = join(dir, "tls-key.pem");
  const certFile = join(dir, "tls-cert.pem");
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyFile,
      "-out",
      certFile,
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
    ],
    { stdio: "ignore" },
  );
  tlsServer = createHttpsServer(
    { key: await readFile(keyFile), cert: await readFile(certFile) },
    (_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("TLS 中文");
    },
  );
  await new Promise((resolve) => tlsServer.listen(0, "127.0.0.1", resolve));
  const tlsRequest = {
    ...exported.resources.httpRequests[0],
    url: `https://127.0.0.1:${tlsServer.address().port}`,
    method: "GET",
    authenticationType: null,
    authentication: {},
    body: {},
    bodyType: null,
    settingValidateCertificates: { enabled: true, value: true },
  };
  const callEphemeral = (request) =>
    hasgardAsync(
      main,
      "ipc",
      "rpc",
      "--args",
      JSON.stringify({
        cmd: "cmd_send_ephemeral_request",
        payload: { request, environmentId: null, cookieJarId: null },
      }),
    );
  let rejected;
  try {
    const result = await callEphemeral(tlsRequest);
    rejected = result.response.error;
  } catch (error) {
    rejected = String(error);
  }
  assert.match(
    rejected ?? "",
    /certificate|cert|tls|ssl/i,
    "self-signed certificate must be rejected",
  );
  const tlsResult = await callEphemeral({
    ...tlsRequest,
    settingValidateCertificates: { enabled: true, value: false },
  });
  assert.equal(tlsResult.response.status, 200);
  assert.equal(Buffer.from(tlsResult.body).toString(), "TLS 中文");
  const savedSettings = rpc("models_get_settings", {});
  try {
    const proxy = {
      type: "enabled",
      http: base,
      https: base,
      auth: { user: "proxy-user", password: "proxy-pass" },
      bypass: "",
      disabled: false,
    };
    rpc("models_upsert", { model: { ...savedSettings, proxy } });
    const proxyResult = await callEphemeral({ ...tlsRequest, url: base + "/proxied" });
    assert.equal(proxyResult.response.status, 200);
    const proxyBody = JSON.parse(Buffer.from(proxyResult.body).toString());
    assert.equal(proxyBody.url, base + "/proxied");
    assert.equal(
      proxyBody.headers["proxy-authorization"],
      "Basic " + Buffer.from("proxy-user:proxy-pass").toString("base64"),
    );
    rpc("models_upsert", { model: { ...savedSettings, proxy: { ...proxy, bypass: "127.0.0.1" } } });
    const direct = await callEphemeral({ ...tlsRequest, url: base + "/proxy-bypass" });
    const directBody = JSON.parse(Buffer.from(direct.body).toString());
    assert.equal(directBody.url, "/proxy-bypass");
    assert.equal(directBody.headers["proxy-authorization"], undefined);
  } finally {
    rpc("models_upsert", { model: savedSettings });
  }
  console.log(
    "PASS: Postman import UI, Basic/Bearer/API key auth, JSON, redirect cookies, SSE, export/reimport, WebSocket echo/close OpenAPI environment resolution, gRPC unary/server streaming TLS validation and authenticated proxy/bypass",
  );
} finally {
  if (tlsServer) {
    tlsServer.closeAllConnections();
    await new Promise((resolve) => tlsServer.close(resolve));
  }
  grpcServer.forceShutdown();
  for (const client of ws.clients) client.terminate();
  ws.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
}
