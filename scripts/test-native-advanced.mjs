#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { connect } from "node:net";
import { createServer as createHttpsServer } from "node:https";
import * as grpc from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import { hasgard, hasgardAsync, until } from "./lib/hasgard.mjs";
const main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
assert.ok(main);
assert.equal(hasgard(main, "ipc", "plugin:app|identifier"), "com.nyssance.apicub.test");
const rpc = (cmd, payload) =>
  hasgardAsync(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
const dir = await mkdtemp(join(tmpdir(), "apicub-advanced-"));
const servers = [];
const tunnelSockets = new Set();
const grpcServer = new grpc.Server();
const settings = await rpc("models_get_settings", {});
const workspaceId = await rpc("models_upsert", {
  model: { model: "workspace", name: "ApiCub 高风险回归" },
});
const send = (request) =>
  rpc("cmd_send_ephemeral_request", { request, environmentId: null, cookieJarId: null });
const body = (result) => Buffer.from(result.body).toString();
const listen = async (server) => {
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
};
const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  // Only isolated repositories and a local bare remote; no hosted-account writes.
  const remote = join(dir, "remote.git");
  git(dir, "init", "--bare", "--initial-branch=main", remote);
  const seed = join(dir, "seed");
  git(dir, "clone", remote, seed);
  const identity = (cwd) => {
    git(cwd, "config", "user.name", "ApiCub Test");
    git(cwd, "config", "user.email", "test@example.invalid");
  };
  identity(seed);
  await writeFile(join(seed, "api.json"), '{"name":"初始"}\n');
  git(seed, "add", ".");
  git(seed, "commit", "-m", "fixture");
  git(seed, "push", "origin", "main");
  const a = join(dir, "a");
  const b = join(dir, "b");
  for (const target of [a, b]) {
    await rpc("cmd_git_clone", { url: remote, dir: target });
    identity(target);
  }
  for (const [target, text] of [
    [a, "第一份"],
    [b, "第二份"],
  ]) {
    if (target === b) await rpc("cmd_git_pull", { dir: target });
    await writeFile(join(target, "api.json"), JSON.stringify({ name: text }) + "\n");
    await rpc("cmd_git_add", { dir: target, relaPaths: ["api.json"] });
    await rpc("cmd_git_commit", { dir: target, message: text });
    await rpc("cmd_git_push", { dir: target });
    assert.equal(git(target, "rev-parse", "HEAD"), git(remote, "rev-parse", "refs/heads/main"));
  }
  await rpc("cmd_git_fetch_all", { dir: a });
  await rpc("cmd_git_pull", { dir: a });
  assert.equal(await readFile(join(a, "api.json"), "utf8"), '{"name":"第二份"}\n');
  await rpc("cmd_git_branch", { dir: a, branch: "test-branch", base: null });
  await rpc("cmd_git_checkout", { dir: a, branch: "test-branch", force: false });
  assert.equal(git(a, "branch", "--show-current"), "test-branch");
  console.log(
    "PASS: native Git clone/stage/commit/push/fetch/pull/branch/checkout against local bare remote",
  );

  await rpc("cmd_git_checkout", { dir: a, branch: "main", force: false });
  const beforeDirtyPull = git(a, "rev-parse", "HEAD");
  await writeFile(join(a, "api.json"), '{"name":"未提交"}\n');
  assert.equal((await rpc("cmd_git_pull", { dir: a })).type, "uncommitted_changes");
  assert.equal(git(a, "rev-parse", "HEAD"), beforeDirtyPull);
  assert.equal(await readFile(join(a, "api.json"), "utf8"), '{"name":"未提交"}\n');
  await rpc("cmd_git_add", { dir: a, relaPaths: ["api.json"] });
  await rpc("cmd_git_commit", { dir: a, message: "local divergence" });
  const localHead = git(a, "rev-parse", "HEAD");
  await writeFile(join(b, "api.json"), '{"name":"远端变化"}\n');
  await rpc("cmd_git_add", { dir: b, relaPaths: ["api.json"] });
  await rpc("cmd_git_commit", { dir: b, message: "remote divergence" });
  await rpc("cmd_git_push", { dir: b });
  const remoteHead = git(remote, "rev-parse", "refs/heads/main");
  await assert.rejects(rpc("cmd_git_push", { dir: a }), /rejected|non.fast.forward|fetch first/i);
  assert.equal(git(remote, "rev-parse", "refs/heads/main"), remoteHead);
  assert.equal((await rpc("cmd_git_pull", { dir: a })).type, "diverged");
  assert.equal(git(a, "rev-parse", "HEAD"), localHead);
  assert.equal(await readFile(join(a, "api.json"), "utf8"), '{"name":"未提交"}\n');
  console.log(
    "PASS: Git dirty pull and divergent pull preserve files/HEAD; rejected push preserves remote",
  );

  const tokens = [];
  const authorizations = [];
  const http = createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/token") {
        const form = Object.fromEntries(new URLSearchParams(data));
        tokens.push(form);
        if (form.client_secret !== "dummy-secret") {
          res.writeHead(401);
          res.end(JSON.stringify({ error: "invalid_client" }));
          return;
        }
        res.end(
          JSON.stringify({
            access_token: "dummy-token-" + tokens.length,
            token_type: "Bearer",
            expires_in: tokens.length === 1 ? -1 : 3600,
          }),
        );
      } else {
        authorizations.push(req.headers.authorization);
        res.end(JSON.stringify({ authorization: req.headers.authorization }));
      }
    });
  });
  const port = await listen(http);
  let request = {
    model: "http_request",
    workspaceId,
    name: "OAuth native test",
    method: "GET",
    url: `http://127.0.0.1:${port}/protected`,
    authenticationType: "oauth2",
    authentication: {
      grantType: "client_credentials",
      credentials: "body",
      clientId: "dummy-client",
      clientSecret: "dummy-secret",
      accessTokenUrl: `http://127.0.0.1:${port}/token`,
      scope: "read",
      headerPrefix: "Bearer",
    },
  };
  request.id = await rpc("models_upsert", { model: request });
  for (const expected of ["dummy-token-1", "dummy-token-2", "dummy-token-2"]) {
    const result = await send(request);
    assert.equal(result.response.status, 200);
    assert.equal(JSON.parse(body(result)).authorization, "Bearer " + expected);
  }
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0].grant_type, "client_credentials");
  assert.equal(tokens[0].client_id, "dummy-client");
  assert.equal(tokens[0].scope, "read");
  const bad = {
    ...request,
    id: undefined,
    authentication: { ...request.authentication, clientId: "bad-client", clientSecret: "wrong" },
  };
  bad.id = await rpc("models_upsert", { model: bad });
  let failed = false;
  try {
    const r = await send(bad);
    failed = !!r.response.error;
  } catch {
    failed = true;
  }
  assert.ok(failed);
  assert.equal(
    tokens.at(-1).client_secret,
    "wrong",
    "token endpoint actually rejected the invalid credential",
  );
  assert.equal(authorizations.length, 3, "failed token request must not reach protected resource");
  const recovered = await send({
    ...bad,
    authentication: { ...bad.authentication, clientSecret: "dummy-secret" },
  });
  assert.equal(recovered.response.status, 200);
  console.log(
    "PASS: OAuth client credentials, expiration/reacquisition/cache, rejection and recovery",
  );

  const makeCert = (name) => {
    const key = join(dir, name + ".key");
    const cert = join(dir, name + ".pem");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        key,
        "-out",
        cert,
        "-days",
        "1",
        "-subj",
        "/CN=" + name,
      ],
      { stdio: "ignore" },
    );
    return { key, cert };
  };
  const serverCert = makeCert("localhost");
  const clientCert = makeCert("apicub-test-client");
  let verified = 0;
  const tls = createHttpsServer(
    {
      key: await readFile(serverCert.key),
      cert: await readFile(serverCert.cert),
      ca: await readFile(clientCert.cert),
      requestCert: true,
      rejectUnauthorized: true,
    },
    (req, res) => {
      assert.ok(req.socket.authorized);
      assert.equal(req.socket.getPeerCertificate().subject.CN, "apicub-test-client");
      assert.equal(req.headers["proxy-authorization"], undefined);
      verified++;
      res.end("双向 TLS");
    },
  );
  const tlsPort = await listen(tls);
  const tlsRequest = {
    ...request,
    authenticationType: null,
    authentication: {},
    url: `https://127.0.0.1:${tlsPort}`,
    settingValidateCertificates: { enabled: true, value: false },
  };
  const rejected = async () => {
    let failed = false;
    try {
      const r = await send(tlsRequest);
      failed = !!r.response.error || r.response.status !== 200;
    } catch {
      failed = true;
    }
    assert.ok(failed, "mTLS must reject missing/mismatched certificate");
  };
  await rpc("models_upsert", { model: { ...settings, clientCertificates: [] } });
  await rejected();
  const certificate = {
    host: "127.0.0.1",
    port: tlsPort,
    crtFile: clientCert.cert,
    keyFile: clientCert.key,
    enabled: true,
  };
  await rpc("models_upsert", { model: { ...settings, clientCertificates: [certificate] } });
  const accepted = await send(tlsRequest);
  assert.equal(accepted.response.status, 200);
  assert.equal(body(accepted), "双向 TLS");
  await rpc("models_upsert", {
    model: { ...settings, clientCertificates: [{ ...certificate, enabled: false }] },
  });
  await rejected();
  await rpc("models_upsert", {
    model: {
      ...settings,
      clientCertificates: [{ ...certificate, port: tlsPort === 65535 ? 65534 : tlsPort + 1 }],
    },
  });
  await rejected();
  assert.equal(verified, 1);
  await rpc("models_upsert", { model: settings });
  console.log("PASS: mTLS certificate identity, missing/disabled/wrong-port rejection");

  const tunnels = [];
  const proxy = createServer((_req, res) => {
    res.writeHead(405);
    res.end();
  });
  proxy.on("connect", (req, client, head) => {
    tunnels.push({ url: req.url, authorization: req.headers["proxy-authorization"] });
    assert.equal(req.url, `127.0.0.1:${tlsPort}`);
    const upstream = connect(tlsPort, "127.0.0.1", () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      client.pipe(upstream);
      upstream.pipe(client);
    });
    for (const socket of [client, upstream]) {
      tunnelSockets.add(socket);
      socket.on("close", () => tunnelSockets.delete(socket));
      socket.on("error", () => {
        client.destroy();
        upstream.destroy();
      });
    }
  });
  const proxyPort = await listen(proxy);
  await rpc("models_upsert", {
    model: {
      ...settings,
      clientCertificates: [certificate],
      proxy: {
        type: "enabled",
        http: `http://127.0.0.1:${proxyPort}`,
        https: `http://127.0.0.1:${proxyPort}`,
        auth: { user: "tunnel-user", password: "dummy-pass" },
        bypass: "",
        disabled: false,
      },
    },
  });
  const tunneled = await send(tlsRequest);
  assert.equal(tunneled.response.status, 200);
  assert.equal(body(tunneled), "双向 TLS");
  assert.equal(tunnels.length, 1);
  assert.equal(
    tunnels[0].authorization,
    "Basic " + Buffer.from("tunnel-user:dummy-pass").toString("base64"),
  );
  assert.equal(verified, 2);
  await rpc("models_upsert", { model: settings });
  console.log("PASS: authenticated HTTPS CONNECT tunnel, mTLS and proxy credential isolation");

  const proto = join(dir, "stream.proto");
  await writeFile(
    proto,
    'syntax="proto3"; package apicub; message Message { string text=1; } service Stream { rpc Client(stream Message) returns(Message); rpc Bidi(stream Message) returns(stream Message); rpc HalfClose(stream Message) returns(stream Message); rpc CancelOpen(stream Message) returns(stream Message); rpc Denied(Message) returns(Message); rpc DeniedClient(stream Message) returns(Message); rpc DeniedBidi(stream Message) returns(stream Message); rpc DeniedStream(Message) returns(stream Message); }',
  );
  const def = grpc.loadPackageDefinition(loadSync(proto));
  let halfClosed = false;
  let cancelled = false;
  grpcServer.addService(def.apicub.Stream.service, {
    Client(call, cb) {
      const messages = [];
      call.on("data", (m) => messages.push(m.text));
      call.on("end", () => cb(null, { text: messages.join("|") }));
    },
    Bidi(call) {
      call.on("data", (m) => call.write(m));
      call.on("end", () => call.end());
    },
    Denied(_call, callback) {
      callback({ code: grpc.status.PERMISSION_DENIED, details: "fixture denied" });
    },
    DeniedClient(call, callback) {
      call.on("data", () => {});
      call.on("end", () =>
        callback({ code: grpc.status.PERMISSION_DENIED, details: "fixture denied" }),
      );
    },
    DeniedBidi(call) {
      call.on("data", () => {});
      call.on("end", () =>
        call.emit("error", { code: grpc.status.PERMISSION_DENIED, details: "fixture denied" }),
      );
    },
    DeniedStream(call) {
      call.emit("error", { code: grpc.status.PERMISSION_DENIED, details: "fixture denied" });
    },
    CancelOpen(call) {
      call.on("data", (m) => call.write(m));
    },
    HalfClose(call) {
      call.on("data", (m) => call.write(m));
      call.on("end", () => {
        halfClosed = true;
      });
      call.on("cancelled", () => {
        cancelled = true;
      });
    },
  });
  const grpcPort = await new Promise((resolve, reject) =>
    grpcServer.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (e, p) =>
      e ? reject(e) : resolve(p),
    ),
  );
  for (const method of [
    "Client",
    "Bidi",
    "HalfClose",
    "CancelOpen",
    "Denied",
    "DeniedClient",
    "DeniedBidi",
    "DeniedStream",
  ]) {
    const id = await rpc("models_upsert", {
      model: {
        model: "grpc_request",
        workspaceId,
        name: method,
        url: `http://127.0.0.1:${grpcPort}`,
        service: "apicub.Stream",
        method,
      },
    });
    const payload = { requestId: id, environmentId: null, protoFiles: [proto] };
    await rpc("cmd_grpc_reflect", payload);
    const connectionId = await rpc("cmd_grpc_go", payload);
    const emit = (payload) =>
      hasgardAsync(
        main,
        "ipc",
        "plugin:event|emit",
        "--args",
        JSON.stringify({ event: "grpc_client_msg_" + connectionId, payload }),
      );
    if (!["Denied", "DeniedStream"].includes(method)) {
      for (const text of ["中文", "Settings"]) await emit({ Message: JSON.stringify({ text }) });
      if (method === "CancelOpen") {
        await until(
          async () =>
            (await rpc("models_grpc_events", { connectionId })).filter(
              (e) => e.eventType === "server_message",
            ).length === 2,
          "echo before cancellation",
        );
        await emit("Cancel");
      } else await emit("Commit");
    }
    if (method === "HalfClose") {
      await until(() => halfClosed, "server receives client half-close");
      await emit("Cancel");
    }
    await until(
      async () =>
        (await rpc("models_grpc_events", { connectionId })).some(
          (e) => e.eventType === "connection_end",
        ),
      method + " finishes",
    );
    const events = await rpc("models_grpc_events", { connectionId });
    assert.equal(
      events.find((e) => e.eventType === "connection_end").status,
      method.startsWith("Denied") ? 7 : ["HalfClose", "CancelOpen"].includes(method) ? 1 : 0,
    );
    if (method.startsWith("Denied"))
      assert.equal(events.find((e) => e.eventType === "connection_end").error, "fixture denied");
    const texts = events
      .filter((e) => e.eventType === "server_message")
      .reverse()
      .map((e) => JSON.parse(e.content).text);
    assert.deepEqual(
      texts,
      method.startsWith("Denied")
        ? []
        : method === "Client"
          ? ["中文|Settings"]
          : ["中文", "Settings"],
    );
    if (method === "HalfClose") await until(() => cancelled, "server sees cancellation");
    console.log("PASS: gRPC " + method);
  }
} finally {
  await rpc("models_upsert", { model: settings });
  grpcServer.forceShutdown();
  for (const socket of tunnelSockets) socket.destroy();
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await rm(dir, { recursive: true, force: true });
}
