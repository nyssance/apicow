import { createStore } from "jotai";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import type { ModelPayload, WorkspaceMeta } from "../bindings/gen_models";
import { modelStoreDataAtom } from "./atoms";
import { initModelStore } from "./store";
import { newStoreData } from "./util";

const events = vi.hoisted(() => ({ onWrite: null as null | ((payloads: ModelPayload[]) => void) }));
vi.mock("@yaakapp-internal/platform", () => ({
  platform: {
    window: { label: "main_0" },
    listen: (_event: string, callback: (payloads: ModelPayload[]) => void) => {
      events.onWrite = callback;
      return () => {};
    },
  },
}));
beforeEach(() => vi.stubGlobal("window", { addEventListener: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
const meta = (updatedAt: string, settingSyncDir: string | null): WorkspaceMeta => ({
  model: "workspace_meta",
  id: "wm_test",
  workspaceId: "wk_test",
  createdAt: "2026-10-29T00:00:00.000001",
  updatedAt,
  encryptionKey: null,
  settingSyncDir,
});
const payload = (model: WorkspaceMeta, background = false): ModelPayload => ({
  model,
  change: { type: "upsert", created: background },
  updateSource: background ? { type: "background" } : { type: "window", label: "main_0" },
});
for (const batched of [false, true]) {
  test(`delayed background creation cannot revert a newer sync-directory edit (batched=${batched})`, () => {
    const store = createStore();
    store.set(modelStoreDataAtom, newStoreData());
    initModelStore(store);
    const edit = meta("2026-10-29T00:00:00.500001", "/test/sync");
    const creation = meta("2026-10-29T00:00:00.000001", null);
    if (batched) events.onWrite!([payload(edit), payload(creation, true)]);
    else {
      events.onWrite!([payload(edit)]);
      events.onWrite!([payload(creation, true)]);
    }
    expect(store.get(modelStoreDataAtom).workspace_meta.wm_test).toEqual(edit);
    const later = meta("2026-10-29T00:00:01.000001", "/test/next");
    events.onWrite!([payload(later, true)]);
    expect(store.get(modelStoreDataAtom).workspace_meta.wm_test).toEqual(later);
  });
}
