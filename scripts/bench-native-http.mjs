#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { platform, arch, release, cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { hasgard, hasgardAsync } from "./lib/hasgard.mjs";
const main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
assert.ok(main);
assert.equal(hasgard(main, "ipc", "plugin:app|identifier"), "day.dreamer.apicow.test");
const rpc = (cmd, payload) =>
  hasgardAsync(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
const settings = await rpc("models_get_settings", {});
assert.ok(
  !settings.proxy || settings.proxy.type !== "enabled",
  "Disable test proxy before benchmarking",
);
const workspaceId = await rpc("models_upsert", {
  model: { model: "workspace", name: "ApiCow HTTP 基准" },
});
const server = createServer((req, res) => {
  const size = Number(req.url.slice(1));
  res.setHeader("Content-Type", "application/octet-stream");
  res.end(Buffer.alloc(size, 97));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const summarize = (values) => {
  const a = [...values].sort((a, b) => a - b);
  return {
    min: a[0],
    median: a[Math.floor(a.length / 2)],
    p95: a[Math.ceil(a.length * 0.95) - 1],
    max: a.at(-1),
  };
};
const rows = [];
try {
  for (const bytes of [1024, 65536]) {
    const samples = [];
    for (let i = 0; i < 24; i++) {
      const start = performance.now();
      const result = await rpc("cmd_send_ephemeral_request", {
        request: {
          model: "http_request",
          workspaceId,
          method: "GET",
          url: `http://127.0.0.1:${server.address().port}/${bytes}`,
          authenticationType: null,
          authentication: {},
        },
        environmentId: null,
        cookieJarId: null,
      });
      const bridgeMs = performance.now() - start;
      assert.equal(result.response.status, 200);
      assert.equal(result.body.length, bytes);
      assert.ok(result.body.every((v) => v === 97));
      if (i >= 4)
        samples.push({
          engineMs: result.response.elapsed,
          headersMs: result.response.elapsedHeaders,
          bridgeMs: Number(bridgeMs.toFixed(3)),
        });
    }
    rows.push({
      bytes,
      warmups: 4,
      iterations: samples.length,
      engineMs: summarize(samples.map((s) => s.engineMs)),
      bridgeMs: summarize(samples.map((s) => s.bridgeMs)),
      samples,
    });
  }
  const result = {
    measuredAt: new Date().toISOString(),
    revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    workingTreeDirty: !!execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
    platform: platform(),
    arch: arch(),
    osRelease: release(),
    cpu: cpus()[0]?.model,
    build: "debug Wry + hasgard-testing",
    scope:
      "local HTTP 127.0.0.1; ephemeral Rust RPC; no UI render timing; native elapsed has millisecond precision; bridge includes CLI startup, IPC and body JSON transfer; no upstream comparison",
    rows,
  };
  const output = process.argv[2];
  if (output) await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify({ ...result, rows: rows.map(({ samples: _samples, ...row }) => row) }, null, 2),
  );
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
