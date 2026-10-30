/// <reference lib="webworker" />

/** One dedicated worker per tab; Web Locks elects the sole OPFS owner. */

import { DB_LOCK_NAME, type FromWorker, type ToWorker } from "./protocol";

/**
 * The wasm is imported lazily, inside `boot()`, rather than at the top of the
 * module. That keeps this script's own evaluation instant, so a tab's connect
 * gets its `hello` immediately regardless of how long the model layer takes to
 * download and compile — and the tab can therefore tell "this worker is dead"
 * from "this worker is busy" with a short timeout.
 */
type Engine = typeof import("@yaakapp-internal/wasm");
let engine: Engine | null = null;

type ReplyPort = { postMessage(message: FromWorker, transfer?: Transferable[]): void };
let tab: MessagePort;
const clientId = crypto.randomUUID();
const channel = new BroadcastChannel("apicow-database");
let ownerId: string | null = null;
let isOwner = false;
const pending = new Map<number, { message: ToWorker; owner: string | null }>();

type PeerMessage =
  | { type: "probe" }
  | { type: "ready"; owner: string }
  | { type: "request"; client: string; owner: string; message: ToWorker }
  | { type: "reply"; client: string; message: FromWorker }
  | { type: "broadcast"; message: FromWorker };

/** Resolves once `boot()` has, or rejects with why it couldn't. */
let booted: Promise<void> | null = null;
let bootError: string | null = null;

function send(port: ReplyPort, message: FromWorker, transfer: Transferable[] = []): void {
  port.postMessage(message, transfer);
}

function broadcast(message: FromWorker): void {
  tab.postMessage(message);
  channel.postMessage({ type: "broadcast", message } satisfies PeerMessage);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function bootOnce(): Promise<void> {
  if (booted != null) return booted;

  booted = (async () => {
    const loaded = await import("@yaakapp-internal/wasm");
    await loaded.boot();
    engine = loaded;
  })();

  booted.catch((err) => {
    bootError = errorMessage(err);
  });

  return booted;
}

async function handle(port: ReplyPort, message: ToWorker): Promise<void> {
  if (message.type === "goodbye") {
    return;
  }

  // Every command waits for boot rather than the tab having to. Tabs post
  // the moment they load; the port queues; this drains once the DB is open.
  try {
    await booted;
  } catch {
    send(port, { type: "error", id: message.id, message: bootError ?? "Database failed to open" });
    return;
  }
  const { rpc, blob_get, blob_put, blob_delete, prepare_http_send } = engine!;

  try {
    switch (message.type) {
      case "rpc": {
        const outcome = rpc(message.cmd, message.payload, message.label) as {
          result: unknown;
          events: unknown[];
        };
        // Result first, to the caller; then the writes, to everyone including
        // the caller. The store applies its own echo the same as any other
        // window's, so it must arrive — and the caller's `await` resolving
        // before its echo lands is fine, because it resolves on the same tick
        // and the store reads on the next.
        send(port, { type: "result", id: message.id, result: outcome.result });
        if (outcome.events.length > 0) {
          broadcast({ type: "event", event: "model_writes", payload: outcome.events });
        }
        return;
      }
      case "prepare_http_send": {
        const prepared = await prepare_http_send(message.payload);
        send(port, { type: "result", id: message.id, result: prepared });
        return;
      }
      case "blob_get": {
        const bytes = blob_get(message.blobId);
        if (bytes == null) {
          send(port, { type: "result", id: message.id, result: null });
        } else {
          // Copy into a fresh buffer we can transfer: the wasm's memory
          // cannot leave the worker.
          const out = new Uint8Array(bytes.byteLength);
          out.set(bytes);
          send(port, { type: "result", id: message.id, result: out.buffer }, [out.buffer]);
        }
        return;
      }
      case "blob_put": {
        blob_put(message.blobId, new Uint8Array(message.bytes));
        send(port, { type: "result", id: message.id, result: null });
        return;
      }
      case "blob_delete": {
        blob_delete(message.blobId);
        send(port, { type: "result", id: message.id, result: null });
        return;
      }
    }
  } catch (err) {
    send(port, { type: "error", id: message.id, message: errorMessage(err) });
  }
}

function deliver(message: FromWorker): void {
  if (message.type === "result" || message.type === "error") pending.delete(message.id);
  tab.postMessage(message);
}

function announceOwner(owner: string): void {
  ownerId = owner;
  tab.postMessage({ type: "ready" } satisfies FromWorker);
  for (const [id, request] of pending) {
    if (request.owner && request.owner !== owner) {
      // Never replay a write whose previous owner may already have committed it.
      deliver({
        type: "error",
        id,
        message: "Database owner closed during the request. Retry the operation.",
      });
    } else if (!request.owner) {
      dispatch(request.message);
    }
  }
}

function replyTo(client: string): ReplyPort {
  return {
    postMessage(message) {
      if (client === clientId) deliver(message);
      else channel.postMessage({ type: "reply", client, message } satisfies PeerMessage);
    },
  };
}

function dispatch(message: ToWorker): void {
  if (message.type === "goodbye") {
    channel.close();
    self.close();
    return;
  }
  pending.set(message.id, { message, owner: ownerId });
  if (!ownerId) return;
  if (isOwner) void handle(replyTo(clientId), message);
  else
    channel.postMessage({
      type: "request",
      client: clientId,
      owner: ownerId,
      message,
    } satisfies PeerMessage);
}

self.onmessage = (event: MessageEvent<{ port: MessagePort }>) => {
  tab = event.data.port;
  tab.onmessage = (event: MessageEvent<ToWorker>) => dispatch(event.data);
  tab.start();
  tab.postMessage({ type: "hello" } satisfies FromWorker);

  channel.onmessage = ({ data }: MessageEvent<PeerMessage>) => {
    switch (data.type) {
      case "probe":
        if (isOwner) channel.postMessage({ type: "ready", owner: clientId } satisfies PeerMessage);
        else if (bootError)
          channel.postMessage({
            type: "broadcast",
            message: { type: "boot_error", message: bootError },
          } satisfies PeerMessage);
        break;
      case "ready":
        announceOwner(data.owner);
        break;
      case "request":
        if (isOwner && data.owner === clientId) void handle(replyTo(data.client), data.message);
        break;
      case "reply":
        if (data.client === clientId) deliver(data.message);
        break;
      case "broadcast":
        tab.postMessage(data.message);
        break;
    }
  };
  channel.postMessage({ type: "probe" } satisfies PeerMessage);

  // Waiters automatically take ownership when a tab closes or its worker dies.
  void navigator.locks
    .request(DB_LOCK_NAME, async () => {
      try {
        await bootOnce();
        isOwner = true;
        announceOwner(clientId);
        channel.postMessage({ type: "ready", owner: clientId } satisfies PeerMessage);
      } catch (error) {
        broadcast({ type: "boot_error", message: errorMessage(error) });
      }
      // Keep OPFS handles and the ownership lock for exactly this worker's lifetime.
      await new Promise<void>(() => {});
    })
    .catch((error: unknown) => broadcast({ type: "boot_error", message: errorMessage(error) }));
};
