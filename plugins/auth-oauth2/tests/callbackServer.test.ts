import { afterEach, expect, test } from "vite-plus/test";
import {
  getRedirectUrlViaExternalBrowser,
  startCallbackServer,
  stopActiveServer,
} from "../src/callbackServer";

afterEach(() => stopActiveServer());
const post = (url: string, callbackUrl: string) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: callbackUrl }),
  });

test("retains a callback received before the consumer starts waiting", async () => {
  const server = await startCallbackServer({ timeoutMs: 1000 });
  const callback = `${server.redirectUri}?code=fixture&state=fixture`;
  expect((await post(server.redirectUri, callback)).status).toBe(200);
  server.stop();
  await expect(server.waitForCallback()).resolves.toBe(callback);
});

test("browser navigation can finish before openExternalUrl resolves", async () => {
  const ctx = {
    toast: { show: async () => {} },
    window: {
      openExternalUrl: async (url: string) => {
        const redirect = new URL(url).searchParams.get("redirect_uri")!;
        await post(redirect, `${redirect}?code=fixture&state=fixture`);
      },
    },
  } as never;
  const result = await getRedirectUrlViaExternalBrowser(
    ctx,
    new URL("http://127.0.0.1/authorize"),
    {
      callbackType: "localhost",
      callbackPort: 0,
    },
  );
  expect(result.callbackUrl).toBe(`${result.redirectUri}?code=fixture&state=fixture`);
}, 2000);

test("multiple waiters observe the same callback", async () => {
  const server = await startCallbackServer({ timeoutMs: 1000 });
  const first = server.waitForCallback();
  const second = server.waitForCallback();
  await post(server.redirectUri, `${server.redirectUri}#access_token=fixture&state=fixture`);
  expect(await first).toBe(await second);
}, 2000);

test("timeout applies even before a consumer waits", async () => {
  const server = await startCallbackServer({ timeoutMs: 10 });
  await new Promise((resolve) => setTimeout(resolve, 30));
  await expect(server.waitForCallback()).rejects.toThrow("Authorization timed out");
});

test("replacing a pending callback server rejects its waiter", async () => {
  const first = await startCallbackServer({ timeoutMs: 1000 });
  const rejected = expect(first.waitForCallback()).rejects.toThrow("Callback server stopped");
  const second = await startCallbackServer({ timeoutMs: 1000 });
  await rejected;
  await post(second.redirectUri, `${second.redirectUri}?code=next`);
  await expect(second.waitForCallback()).resolves.toBe(`${second.redirectUri}?code=next`);
});

test("wrong path and malformed JSON do not consume the callback", async () => {
  const server = await startCallbackServer({ timeoutMs: 1000 });
  expect((await post(server.redirectUri + "-wrong", "bad")).status).toBe(404);
  expect((await fetch(server.redirectUri, { method: "POST", body: "{" })).status).toBe(400);
  await post(server.redirectUri, `${server.redirectUri}?code=valid`);
  await expect(server.waitForCallback()).resolves.toBe(`${server.redirectUri}?code=valid`);
});
