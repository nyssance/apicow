import { promisify } from "node:util";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
const socket = process.env.TAURI_HASGARD_SOCKET;
assert.ok(socket, "Set TAURI_HASGARD_SOCKET to the running ApiCub Test socket");
export function hasgard(window, ...args) {
  return JSON.parse(
    execFileSync(
      "tauri-hasgard",
      ["--socket", socket, "--json", ...(window ? ["--window", window] : []), ...args],
      { encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] },
    ),
  );
}
export const evaluate = (window, expression) => hasgard(window, "eval", expression);
export async function until(check, description) {
  const deadline = Date.now() + 15000;
  let last;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await setTimeout(150);
  }
  throw new Error(`Timed out: ${description}`, { cause: last });
}
export function clickText(window, text) {
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

export async function hasgardAsync(window, ...args) {
  const { stdout } = await promisify(execFile)(
    "tauri-hasgard",
    ["--socket", socket, "--json", ...(window ? ["--window", window] : []), ...args],
    { encoding: "utf8", timeout: 20000 },
  );
  return JSON.parse(stdout);
}
