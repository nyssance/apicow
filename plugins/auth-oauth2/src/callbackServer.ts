import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import type { Context } from "@yaakapp/api";

export const DEFAULT_LOCALHOST_PORT = 8765;
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Singleton: only one callback server runs at a time across all OAuth flows. */
let activeServer: CallbackServerResult | null = null;

export interface CallbackServerResult {
  /** The port the server is listening on */
  port: number;
  /** The full redirect URI to register with the OAuth provider */
  redirectUri: string;
  /** Promise that resolves with the callback URL when received */
  waitForCallback: () => Promise<string>;
  /** Stop the server */
  stop: () => void;
}

/**
 * Start a local HTTP server to receive OAuth callbacks.
 * Only one server runs at a time — if a previous server is still active,
 * it is stopped before starting the new one.
 * Returns the port, redirect URI, and a promise that resolves when the callback is received.
 */
export function startCallbackServer(options: {
  /** Specific port to use, or 0 for random available port */
  port?: number;
  /** Path for the callback endpoint */
  path?: string;
  /** Timeout in milliseconds (default 5 minutes) */
  timeoutMs?: number;
}): Promise<CallbackServerResult> {
  // Stop any previously active server before starting a new one
  if (activeServer) {
    console.log("[oauth2] Stopping previous callback server before starting new one");
    activeServer.stop();
    activeServer = null;
  }

  const { port = 0, path = "/callback", timeoutMs = CALLBACK_TIMEOUT_MS } = options;

  return new Promise((resolve, reject) => {
    let callbackResolve: ((url: string) => void) | null = null;
    let callbackReject: ((err: Error) => void) | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    // Register the result before opening a browser: navigation may complete
    // before openExternalUrl resolves and the consumer starts waiting.
    const callbackPromise = new Promise<string>((res, rej) => {
      callbackResolve = res;
      callbackReject = rej;
    });
    // stop/timeout can precede the consumer; preserve rejection without an
    // unhandled rejection while the browser-opening operation is still pending.
    void callbackPromise.catch(() => {});

    const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
      const reqUrl = new URL(req.url ?? "/", `http://${req.headers.host}`);

      // Only handle the callback path
      if (reqUrl.pathname !== path && reqUrl.pathname !== `${path}/`) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }

      if (req.method === "POST") {
        // POST: read JSON body with the final callback URL and resolve
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const { url: callbackUrl } = JSON.parse(body);
            if (!callbackUrl || typeof callbackUrl !== "string") {
              res.writeHead(400, { "Content-Type": "text/plain" });
              res.end("Missing url in request body");
              return;
            }

            // Send success response
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("OK");

            // Resolve the callback promise
            if (callbackResolve) {
              callbackResolve(callbackUrl);
              callbackResolve = null;
              callbackReject = null;
            }

            // Stop the server after a short delay to ensure response is sent
            setTimeout(() => stopServer(), 100);
          } catch {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Invalid JSON");
          }
        });
        return;
      }

      // GET: serve intermediate page that reads the fragment and POSTs back
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getFragmentForwardingHtml());
    });

    server.on("error", (err: Error) => {
      if (!stopped) {
        reject(err);
      }
    });

    const stopServer = () => {
      if (stopped) return;
      stopped = true;

      // Clear the singleton reference
      if (activeServer?.stop === stopServer) {
        activeServer = null;
      }

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      server.close();

      if (callbackReject) {
        callbackReject(new Error("Callback server stopped"));
        callbackResolve = null;
        callbackReject = null;
      }
    };

    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }

      const actualPort = address.port;
      const redirectUri = `http://127.0.0.1:${actualPort}${path}`;

      console.log(`[oauth2] Callback server listening on ${redirectUri}`);

      const result: CallbackServerResult = {
        port: actualPort,
        redirectUri,
        waitForCallback: () => callbackPromise,
        stop: stopServer,
      };

      timeoutHandle = setTimeout(() => {
        if (callbackReject) {
          callbackReject(new Error("Authorization timed out"));
          callbackResolve = null;
          callbackReject = null;
        }
        stopServer();
      }, timeoutMs);

      activeServer = result;
      resolve(result);
    });
  });
}

/**
 * Stop the active callback server if one is running.
 * Called during plugin dispose to ensure the server is cleaned up before the process exits.
 */
export function stopActiveServer(): void {
  if (activeServer) {
    console.log("[oauth2] Stopping active callback server during dispose");
    activeServer.stop();
    activeServer = null;
  }
}

/**
 * Open an authorization URL in the system browser, start a local callback server,
 * and wait for the OAuth provider to redirect back.
 *
 * Returns the raw callback URL and the redirect URI that was registered with the
 * OAuth provider (needed for token exchange).
 */
export async function getRedirectUrlViaExternalBrowser(
  ctx: Context,
  authorizationUrl: URL,
  options: {
    callbackType: "localhost" | "hosted";
    callbackPort?: number;
  },
): Promise<{ callbackUrl: string; redirectUri: string }> {
  const { callbackType, callbackPort } = options;

  const port = callbackPort ?? DEFAULT_LOCALHOST_PORT;

  console.log(`[oauth2] Starting callback server (type: ${callbackType}, port: ${port})`);

  const server = await startCallbackServer({
    port,
    path: "/callback",
  });

  try {
    // Legacy hosted selections also use loopback; ApiCow never relays OAuth credentials
    // through an upstream service. The form displays this URI for provider registration.
    const oauthRedirectUri = server.redirectUri;

    // Set the redirect URI on the authorization URL
    authorizationUrl.searchParams.set("redirect_uri", oauthRedirectUri);

    const authorizationUrlStr = authorizationUrl.toString();
    console.log("[oauth2] Opening external browser:", authorizationUrlStr);

    // Show toast to inform user
    await ctx.toast.show({
      message: "Opening browser for authorization...",
      icon: "info",
      timeout: 3000,
    });

    // Open the system browser
    await ctx.window.openExternalUrl(authorizationUrlStr);

    // Wait for the callback
    console.log("[oauth2] Waiting for callback on", server.redirectUri);
    const callbackUrl = await server.waitForCallback();

    console.log("[oauth2] Received callback:", callbackUrl);

    return { callbackUrl, redirectUri: oauthRedirectUri };
  } finally {
    server.stop();
  }
}

/**
 * Intermediate HTML page that reads the URL fragment and _fragment query param,
 * reconstructs a proper OAuth callback URL, and POSTs it back to the server.
 *
 * Handles three cases:
 * - Localhost implicit: fragment is in location.hash (e.g. #access_token=...)
 * - Hosted implicit: fragment was converted to ?_fragment=... by the hosted redirect page
 * - Auth code: no fragment, code is already in query params
 */
function getFragmentForwardingHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ApiCow</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: hsl(244,23%,14%);
      color: hsl(245,23%,85%);
    }
    .container { text-align: center; }
    .brand { font-size: 32px; font-weight: 700; color: white; margin-bottom: 32px; }
    h1 { font-size: 28px; font-weight: 600; margin-bottom: 12px; }
    p { font-size: 16px; color: hsl(245,18%,58%); }
  </style>
</head>
<body>
  <div class="container">
    <p class="brand">ApiCow</p>
    <h1 id="title">Sending authorization callback...</h1>
    <p id="message">Please wait</p>
  </div>
  <script>
  (function() {
    var title = document.getElementById('title');
    var message = document.getElementById('message');
    // This page runs in the external browser, outside the app's locale storage.
    var chinese = (navigator.language || 'en').toLowerCase().startsWith('zh');
    document.documentElement.lang = chinese ? 'zh-CN' : 'en';
    var copy = chinese ? {
      sending: '正在发送授权回调…',
      wait: '请稍候',
      received: '已收到授权回调',
      returnToApp: '请返回 ApiCow 查看授权结果。你可以关闭此标签页。',
      failed: '授权回调发送失败',
      retry: '请返回 ApiCow 重新尝试授权。'
    } : {
      sending: 'Sending authorization callback...',
      wait: 'Please wait',
      received: 'Authorization callback received',
      returnToApp: 'Return to ApiCow to check the authorization result. You may close this tab.',
      failed: 'Could not send authorization callback',
      retry: 'Return to ApiCow and try authorizing again.'
    };
    title.textContent = copy.sending;
    message.textContent = copy.wait;
    var url = new URL(window.location.href);
    var fragment = window.location.hash;
    var fragmentParam = url.searchParams.get('_fragment');

    // Build the final callback URL:
    // 1. If _fragment query param exists (from hosted redirect), convert it back to a real fragment
    // 2. If location.hash exists (direct localhost implicit), use it as-is
    // 3. Otherwise (auth code flow), use the URL as-is with query params
    if (fragmentParam) {
      url.searchParams.delete('_fragment');
      url.hash = fragmentParam;
    } else if (fragment && fragment.length > 1) {
      url.hash = fragment;
    }

    // POST the final URL back to the callback server
    fetch(url.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.toString() })
    }).then(function(res) {
      if (res.ok) {
        title.textContent = copy.received;
        message.textContent = copy.returnToApp;
      } else {
        title.textContent = copy.failed;
        message.textContent = copy.retry;
      }
    }).catch(function() {
      title.textContent = copy.failed;
      message.textContent = copy.retry;
    });
  })();
  </script>
</body>
</html>`;
}
