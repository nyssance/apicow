#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { openSync, closeSync, watch } from "node:fs";
import { mkdtemp, writeFile, readFile, readdir, rm, access, chmod, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import { hasgard, hasgardAsync, until } from "./lib/hasgard.mjs";
const binary = resolve("target/debug/bundle/macos/ApiCub Test.app/Contents/MacOS/yaak-app-client");
let main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
const rpc = (cmd, payload) =>
  hasgardAsync(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
const identify = () =>
  assert.equal(hasgard(main, "ipc", "plugin:app|identifier"), "com.nyssance.apicub.test");
identify();
const dir = await mkdtemp(join(tmpdir(), "apicub-recovery-"));
const syncDir = join(dir, "sync");
await mkdir(syncDir);
let appPid;
function findAppPid() {
  const pids = execFileSync("pgrep", ["-f", "ApiCub Test.app/Contents/MacOS/yaak-app-client$"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .map(Number);
  assert.equal(pids.length, 1, "exactly one isolated Test app");
  const command = execFileSync("ps", ["-p", String(pids[0]), "-o", "comm="], {
    encoding: "utf8",
  }).trim();
  assert.ok(command.endsWith("ApiCub Test.app/Contents/MacOS/yaak-app-client"));
  return pids[0];
}
async function killTest() {
  identify();
  appPid = findAppPid();
  process.kill(appPid, "SIGKILL");
}
async function restart() {
  await until(() => {
    try {
      process.kill(appPid, 0);
      return false;
    } catch {
      return true;
    }
  }, "killed Test process exited");
  const log = openSync(join(dir, "app.log"), "a");
  const child = spawn(binary, [], {
    detached: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, TAURI_HASGARD_SOCKET: process.env.TAURI_HASGARD_SOCKET },
  });
  child.unref();
  closeSync(log);
  await until(async () => {
    const windows = await hasgardAsync(null, "windows");
    main = windows.windows.find((w) => w.label.startsWith("main_"))?.label;
    return (
      main &&
      (await hasgardAsync(main, "ipc", "plugin:app|identifier")) === "com.nyssance.apicub.test"
    );
  }, "Test app restarted");
}
const workspaceId = await rpc("models_upsert", {
  model: { model: "workspace", name: "强退恢复测试" },
});
const requestIds = [];
const payloadText = "原始中文 Settings " + "x".repeat(8192);
for (let i = 0; i < 8; i++)
  requestIds.push(
    await rpc("models_upsert", {
      model: {
        model: "http_request",
        workspaceId,
        name: `恢复请求 ${i}`,
        method: "POST",
        url: "http://127.0.0.1:1/recovery",
        bodyType: "application/json",
        body: { text: JSON.stringify({ text: payloadText, index: i }) },
      },
    }),
  );
const exported = async () =>
  JSON.parse(
    await rpc("cmd_export_data", { workspaceIds: [workspaceId], includePrivateEnvironments: true }),
  );
const expected = (await exported()).resources.httpRequests;
const verifyDb = async () => {
  const requests = (await exported()).resources.httpRequests;
  assert.equal(requests.length, 8);
  assert.deepEqual(
    requests
      .map((r) => ({ id: r.id, name: r.name, body: r.body }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    expected
      .map((r) => ({ id: r.id, name: r.name, body: r.body }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
};
const gitDir = join(dir, "git");
await mkdir(gitDir);
const git = (...args) =>
  execFileSync("git", args, {
    cwd: gitDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const release = join(dir, "release");
const started = join(dir, "hook-started");
const finished = join(dir, "hook-finished");
let watcher;
try {
  await killTest();
  await restart();
  await verifyDb();
  console.log(
    "PASS: acknowledged SQLite writes survive SIGKILL with exact Unicode bodies and no duplicate requests",
  );
  const ops = await rpc("cmd_sync_calculate", { workspaceId, syncDir });
  assert.ok(ops.length >= 8);
  appPid = findAppPid();
  let interrupted = false;
  let settled = false;
  watcher = watch(syncDir, () => {
    if (!interrupted && !settled) {
      interrupted = true;
      process.kill(appPid, "SIGKILL");
    }
  });
  const applying = rpc("cmd_sync_apply", { workspaceId, syncDir, syncOps: ops, fsOnly: false })
    .then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    .finally(() => {
      settled = true;
    });
  await applying;
  watcher.close();
  assert.ok(interrupted, "kill after first filesystem event, before sync RPC completed");
  const published = (await readdir(syncDir)).filter((p) => p.endsWith(".yaml"));
  for (const path of published) {
    const model = parse(await readFile(join(syncDir, path), "utf8"));
    assert.ok(model.id);
    if (model.model === "http_request")
      assert.equal(model.body.text, expected.find((r) => r.id === model.id).body.text);
  }
  await restart();
  await verifyDb();
  const remaining = await rpc("cmd_sync_calculate", { workspaceId, syncDir });
  assert.ok(
    !remaining.some((op) => op.type === "dbDelete"),
    "interrupted initial publish must not delete database models",
  );
  await rpc("cmd_sync_apply", { workspaceId, syncDir, syncOps: remaining, fsOnly: false });
  const all = (await readdir(syncDir)).filter((p) => p.endsWith(".yaml"));
  const synced = [];
  for (const p of all) {
    const m = parse(await readFile(join(syncDir, p), "utf8"));
    if (m.model === "http_request") synced.push(m.id);
  }
  assert.deepEqual(
    synced.sort((a, b) => a.localeCompare(b)),
    [...requestIds].sort((a, b) => a.localeCompare(b)),
  );
  await verifyDb();
  console.log(
    `PASS: interrupted sync (${published.length} published files), complete YAML, restart reconciliation without data loss`,
  );
  git("init", "--initial-branch=main");
  git("config", "user.name", "ApiCub Test");
  git("config", "user.email", "test@example.invalid");
  await writeFile(join(gitDir, "api.json"), '{"text":"提交恢复 中文 Settings"}\n');
  await rpc("cmd_git_add", { dir: gitDir, relaPaths: ["api.json"] });
  const hook = join(gitDir, ".git/hooks/pre-commit");
  const q = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
  await writeFile(
    hook,
    `#!/bin/sh\nprintf ready > ${q(started)}\nwhile [ ! -f ${q(release)} ]; do sleep 0.1; done\nprintf done > ${q(finished)}\n`,
  );
  await chmod(hook, 0o700);
  const committing = rpc("cmd_git_commit", { dir: gitDir, message: "唯一恢复提交" }).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await until(async () => {
    try {
      await access(started);
      return true;
    } catch {
      return false;
    }
  }, "Git pre-commit reached");
  await killTest();
  await writeFile(release, "release");
  await committing;
  await until(() => {
    try {
      return git("rev-list", "--count", "HEAD") === "1";
    } catch {
      return false;
    }
  }, "orphaned Git operation settles");
  await restart();
  await verifyDb();
  assert.equal(git("rev-list", "--count", "HEAD"), "1");
  assert.equal(git("status", "--porcelain"), "");
  assert.equal(git("show", "HEAD:api.json"), '{"text":"提交恢复 中文 Settings"}');
  await rpc("cmd_git_status", { dir: gitDir });
  assert.equal(git("rev-list", "--count", "HEAD"), "1");
  console.log(
    "PASS: app SIGKILL during commit hook, one completed commit, intact worktree/index and no startup replay",
  );
} finally {
  watcher?.close();
  await writeFile(release, "release");
  const hookStarted = await access(started).then(
    () => true,
    () => false,
  );
  if (hookStarted) {
    await until(async () => {
      await access(finished);
      return true;
    }, "released Git hook finished before fixture cleanup");
  }
  await rm(dir, { recursive: true, force: true });
}
