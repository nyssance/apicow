#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { hasgard, evaluate, until, clickText } from "./lib/hasgard.mjs";

const main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
assert.ok(main, "ApiCow main window is open");
assert.equal(
  hasgard(main, "ipc", "plugin:app|identifier"),
  "day.dreamer.apicow.test",
  "Only run against the isolated ApiCow Test application",
);
await until(() => evaluate(main, 'document.readyState === "complete"'), "main ready");
// Support a fresh test profile, without importing real workspaces or credentials.
if (
  evaluate(
    main,
    'document.body.innerText.includes("从空白开始") || document.body.innerText.includes("Start fresh")',
  )
) {
  evaluate(
    main,
    `Array.from(document.querySelectorAll('button')).find(e => /从空白开始|Start fresh/i.test(e.textContent))?.click()`,
  );
  await until(
    () =>
      evaluate(
        main,
        `!!document.querySelector('button[title="主菜单"],button[title="Main Menu"]')`,
      ),
    "workspace ready",
  );
}
hasgard(main, "click", 'button[title="主菜单"],button[title="Main Menu"]');
evaluate(
  main,
  `Array.from(document.querySelectorAll('[role="menu"] button')).find(e => /^(设置|Settings)/.test(e.textContent))?.click()`,
);
const settings = await until(
  () => hasgard(null, "windows").windows.find((w) => w.label === "other__settings")?.label,
  "settings window",
);
await until(() => evaluate(settings, '!!document.querySelector("select")'), "settings ready");
for (const locale of ["en", "zh-CN"]) {
  await until(
    () => evaluate(settings, '!!document.querySelector("select")'),
    "language selector after reload",
  );
  hasgard(settings, "select", "select", locale);
  for (const window of [settings, main]) {
    await until(
      () =>
        evaluate(
          window,
          `document.documentElement.lang === ${JSON.stringify(locale)} && localStorage.getItem('apicow.locale') === ${JSON.stringify(locale)}`,
        ),
      `${window} ${locale}`,
    );
  }
}
await until(
  () => evaluate(main, 'document.body.innerText.includes("无环境")'),
  "Chinese environment fallback after reload",
);
await until(
  () =>
    evaluate(
      settings,
      'Array.from(document.querySelectorAll("button")).some(e => e.textContent.trim() === "快捷键")',
    ),
  "settings navigation after reload",
);
clickText(settings, "快捷键");
hasgard(settings, "fill", 'input[placeholder="筛选快捷键…"]', "发送当前请求");
await until(
  () =>
    evaluate(
      settings,
      `Array.from(document.querySelectorAll('table tbody tr')).some(e => e.textContent.includes('发送当前请求'))`,
    ),
  "Chinese shortcut search",
);
assert.equal(
  evaluate(
    settings,
    `Array.from(document.querySelectorAll('table tbody tr')).some(e => e.textContent.includes('放大'))`,
  ),
  false,
);
hasgard(settings, "fill", 'input[placeholder="筛选快捷键…"]', "request send");
await until(
  () =>
    evaluate(
      settings,
      `Array.from(document.querySelectorAll('table tbody tr')).some(e => e.textContent.includes('发送当前请求'))`,
    ),
  "English shortcut search retained",
);
hasgard(settings, "fill", 'input[placeholder="筛选快捷键…"]', "");
await until(
  () => evaluate(settings, 'document.querySelector("table")?.innerText.includes("复制请求")'),
  "all shortcut labels restored after clearing filter",
);
assert.equal(
  evaluate(settings, '/Sidebar|Duplicate Request/.test(document.querySelector("table").innerText)'),
  false,
);
hasgard(main, "click", 'button[title="添加资源"]');
clickText(main, "HTTP");
await until(() => evaluate(main, '!!document.querySelector("form .cm-content")'), "request editor");
const received = [];
const server = createServer((req, res) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    const result = { method: req.method, path: req.url, body };
    received.push(result);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const path = "/echo?Name=Send%20%E4%B8%AD%E6%96%87";
  const url = `http://127.0.0.1:${server.address().port}${path}`;
  // Hasgard fill targets native inputs. CodeMirror uses a document model;
  // dispatch through its view so React's real change/save path also runs.
  evaluate(
    main,
    `(() => {
    const view = document.querySelector('form .cm-content').cmTile.view;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: ${JSON.stringify(url)} } });
    return true;
  })()`,
  );
  hasgard(main, "click", 'button[title="发送请求 ⌘↩︎"]');
  await until(() => received.length === 1, "GET received");
  assert.deepEqual(received[0], { method: "GET", path, body: "" });
  await until(
    () => evaluate(main, 'document.body.innerText.includes("200 OK")'),
    "GET response rendered",
  );
  hasgard(main, "click", "form button");
  clickText(main, "POST");
  clickText(main, "请求体");
  clickText(main, "JSON");
  await until(
    () =>
      evaluate(
        main,
        `Array.from(document.querySelectorAll('.cm-content')).some(e => e.getBoundingClientRect().height > 100 && e.cmTile.view.state.doc.length === 0)`,
      ),
    "JSON editor",
  );
  const body = JSON.stringify({ Name: "Send 中文", value: "Settings" });
  evaluate(
    main,
    `(() => {
    const e = Array.from(document.querySelectorAll('.cm-content')).find(e => e.getBoundingClientRect().height > 100 && e.cmTile.view.state.doc.length === 0);
    const view = e.cmTile.view;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: ${JSON.stringify(body)} } });
    return true;
  })()`,
  );
  hasgard(main, "click", 'button[title="发送请求 ⌘↩︎"]');
  await until(() => received.length === 2, "POST received");
  assert.deepEqual(received[1], { method: "POST", path, body });
  await until(
    () =>
      evaluate(
        main,
        'Array.from(document.querySelectorAll(".cm-content")).some(e => e.cmTile.view.state.doc.toString().includes("\\\"method\\\": \\\"POST\\\""))',
      ),
    "POST response rendered",
  );
  console.log(
    "PASS: packaged workspace, settings, English/Chinese cross-window persistence, GET and POST exact payloads",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
