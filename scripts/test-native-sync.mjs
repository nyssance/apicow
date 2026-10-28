#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { hasgard, hasgardAsync, evaluate, clickText, until } from "./lib/hasgard.mjs";
const main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
assert.ok(main);
assert.equal(hasgard(main, "ipc", "plugin:app|identifier"), "com.nyssance.apicub.test");
const rpc = (cmd, payload) =>
  hasgardAsync(main, "ipc", "rpc", "--args", JSON.stringify({ cmd, payload }));
const dir = await mkdtemp(
  join(homedir(), "Library/Application Support/com.nyssance.apicub.test", "native-sync-"),
);
const workspaceId = await rpc("models_upsert", {
  model: { model: "workspace", name: "文件同步界面回归" },
});
const requestId = await rpc("models_upsert", {
  model: {
    model: "http_request",
    workspaceId,
    name: "原始中文 Settings",
    method: "GET",
    url: "http://127.0.0.1:1/original",
  },
});
let meta;
const git = (...args) =>
  execFileSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
try {
  evaluate(main, `window.__syncLeaving=true;location.href='/workspaces/${workspaceId}'`);
  await until(
    () =>
      evaluate(
        main,
        '!window.__syncLeaving && document.readyState === "complete" && document.body.innerText.includes("设置文件同步或 Git")',
      ),
    "workspace loaded",
  );
  clickText(main, "设置文件同步或 Git");
  clickText(main, "打开工作区设置");
  await until(
    () => evaluate(main, '!!document.querySelector("[role=dialog]")'),
    "workspace settings",
  );
  const position = await until(
    () =>
      evaluate(
        main,
        `(()=>{const e=Array.from(document.querySelectorAll('[role=dialog] button')).find(e=>/选择目录|Select Directory|Select Folder|选择文件夹/.test(e.textContent));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
      ),
    "directory drop target",
  );
  assert.ok(
    evaluate(main, 'document.querySelector("[role=dialog]").innerText.includes("选择目录")'),
  );
  const emit = (event, payload) =>
    hasgardAsync(
      main,
      "ipc",
      "plugin:event|emit_to",
      "--args",
      JSON.stringify({ target: { kind: "WebviewWindow", label: main }, event, payload }),
    );
  await emit("tauri://drag-over", { position });
  await until(
    () =>
      evaluate(main, `!!document.querySelector('[role="dialog"] button[class*="border-notice"]')`),
    "drop highlight",
  );
  await emit("tauri://drag-drop", { position, paths: [dir] });
  await until(async () => {
    meta = await rpc("cmd_get_workspace_meta", { workspaceId });
    return meta.settingSyncDir === dir;
  }, "directory selection saved");
  // Close via the real dialog button, not a mocked settings callback.
  assert.equal(
    evaluate(
      main,
      'document.querySelector("[role=dialog]").innerText.includes("Select Directory")',
    ),
    false,
  );
  const close = evaluate(
    main,
    `(()=>{const e=document.querySelector('[role=dialog] button[title="关闭对话框（Esc）"], [role=dialog] button[aria-label="关闭"]');if(!e)return false;e.click();return true;})()`,
  );
  if (!close) hasgard(main, "press", "Escape");
  const yamlFile = await until(async () => {
    const paths = await readdir(dir, { recursive: true });
    for (const p of paths) {
      if (!/\.ya?ml$/.test(p)) continue;
      const text = await readFile(join(dir, p), "utf8");
      if (text.includes(requestId)) return p;
    }
    return null;
  }, "request serialized to YAML");
  const yaml = await readFile(join(dir, yamlFile), "utf8");
  assert.ok(yaml.includes("原始中文 Settings"));
  await writeFile(join(dir, yamlFile), yaml.replace("原始中文 Settings", "磁盘修改 Settings"));
  await until(
    () => evaluate(main, 'document.body.innerText.includes("检测到更改")'),
    "disk change confirmation",
  );
  assert.ok(
    evaluate(main, 'document.querySelector("[role=dialog]").innerText.includes("个文件发生变化")'),
  );
  assert.equal(
    evaluate(main, '/\\bupdate\\b/.test(document.querySelector("[role=dialog] table").innerText)'),
    false,
  );
  clickText(main, "应用更改");
  await until(
    () => evaluate(main, '!document.querySelector("[role=dialog]")'),
    "disk changes applied and dialog closed",
  );
  await until(
    () => evaluate(main, 'document.body.innerText.includes("磁盘修改 Settings")'),
    "filesystem watcher updates sidebar",
  );
  await until(
    () => evaluate(main, 'document.body.innerText.includes("设置 Git")'),
    "git setup visible",
  );
  clickText(main, "设置 Git");
  clickText(main, "初始化 Git 仓库");
  await until(async () => {
    try {
      return git("rev-parse", "--is-inside-work-tree") === "true";
    } catch {
      return false;
    }
  }, "UI initializes Git");
  git("config", "user.name", "ApiCub Test");
  git("config", "user.email", "test@example.invalid");
  const branch = git("branch", "--show-current");
  await until(
    () =>
      evaluate(
        main,
        `Array.from(document.querySelectorAll('button')).some(e=>e.textContent.trim()===${JSON.stringify(branch)})`,
      ),
    "Git branch menu",
  );
  clickText(main, branch);
  clickText(main, "提交…");
  await until(
    () => evaluate(main, '!!document.querySelector("[role=dialog] input[type=checkbox]")'),
    "commit changes tree",
  );
  assert.ok(evaluate(main, 'document.querySelector("[role=dialog]").innerText.includes("未跟踪")'));
  hasgard(main, "click", "[role=dialog] input[type=checkbox]");
  await until(
    () => git("diff", "--cached", "--name-only").includes(yamlFile),
    "UI stages request file",
  );
  evaluate(
    main,
    `(()=>{const view=document.querySelector('[role="dialog"] .cm-content').cmTile.view;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:'通过界面提交 中文 Settings'}});})()`,
  );
  await until(
    () =>
      evaluate(
        main,
        'Array.from(document.querySelectorAll("[role=dialog] button")).some(e=>e.textContent.trim()==="提交"&&!e.disabled)',
      ),
    "commit enabled",
  );
  clickText(main, "提交");
  await until(() => {
    try {
      return git("log", "-1", "--format=%s") === "通过界面提交 中文 Settings";
    } catch {
      return false;
    }
  }, "UI writes commit");
  assert.ok(git("show", `HEAD:${yamlFile}`).includes("磁盘修改 Settings"));
  await until(
    () => evaluate(main, '!document.querySelector("[role=dialog]")'),
    "commit dialog closes",
  );
  console.log(
    "PASS: directory drop UI, YAML output, confirmed external edit, Git initialization/staging/commit UI",
  );
} finally {
  try {
    meta ??= await until(
      () => rpc("cmd_get_workspace_meta", { workspaceId }),
      "cleanup bridge ready",
    );
    await rpc("models_upsert", { model: { ...meta, settingSyncDir: null } });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
