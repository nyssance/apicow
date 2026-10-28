#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";

const socket = process.env.TAURI_HASGARD_SOCKET;
assert.ok(socket, "Set TAURI_HASGARD_SOCKET to the running ApiCub Test socket");
function hasgard(window, ...args) {
  return JSON.parse(
    execFileSync(
      "tauri-hasgard",
      ["--socket", socket, "--json", ...(window ? ["--window", window] : []), ...args],
      { encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] },
    ),
  );
}
const evaluate = (window, expression) => hasgard(window, "eval", expression);
async function until(check, description) {
  const deadline = Date.now() + 15000;
  let last;
  while (Date.now() < deadline) {
    try {
      const value = check();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await setTimeout(150);
  }
  throw new Error(`Timed out: ${description}`, { cause: last });
}
function clickText(window, text) {
  assert.equal(
    evaluate(
      window,
      `(() => {
    const e = Array.from(document.querySelectorAll('button')).find(e => e.textContent.trim() === ${JSON.stringify(text)} && e.getBoundingClientRect().height > 0);
    if (!e) return false; e.click(); return true;
  })()`,
    ),
    true,
    `Button: ${text}`,
  );
}
const main = hasgard(null, "windows").windows.find((w) => w.label.startsWith("main_"))?.label;
assert.ok(main, "ApiCub main window is open");
assert.equal(
  hasgard(main, "ipc", "plugin:app|identifier"),
  "com.nyssance.apicub.test",
  "Only run against the isolated ApiCub Test application",
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
        '!!document.querySelector("button[title="主菜单"],button[title="Main Menu"]")',
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
  hasgard(settings, "select", "select", locale);
  for (const window of [settings, main]) {
    await until(
      () =>
        evaluate(
          window,
          `document.documentElement.lang === ${JSON.stringify(locale)} && localStorage.getItem('apicub.locale') === ${JSON.stringify(locale)}`,
        ),
      `${window} ${locale}`,
    );
  }
}
assert.ok(
  evaluate(main, 'document.body.innerText.includes("无环境")'),
  "Chinese environment fallback",
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
