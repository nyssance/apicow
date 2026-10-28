import { afterEach, expect, test, vi } from "vite-plus/test";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@yaakapp-internal/platform", () => ({
  platform: { capabilities: { multiWindow: true } },
}));
vi.mock("../hooks/useActiveWorkspace", () => ({ activeWorkspaceIdAtom: "workspace" }));
vi.mock("../hooks/useFastMutation", () => ({
  createFastMutation: (args: { mutationFn: unknown }) => ({ mutateAsync: args.mutationFn }),
}));
vi.mock("../lib/dialog", () => ({ showDialog: vi.fn() }));
vi.mock("../lib/jotai", () => ({ jotaiStore: { get: () => "wk_test" } }));
vi.mock("../lib/router", () => ({
  router: { buildLocation: () => ({ href: "/workspaces/wk_test/settings" }) },
}));
vi.mock("../lib/rpc", () => ({ rpc }));
import { openSettings } from "./openSettings";
afterEach(() => vi.unstubAllGlobals());
test("Chinese window title preserves the internal settings window label", async () => {
  vi.stubGlobal("localStorage", { getItem: () => "zh-CN" });
  await openSettings.mutateAsync("general");
  expect(rpc).toHaveBeenCalledWith(
    "cmd_new_child_window",
    expect.objectContaining({ label: "settings", title: "ApiCub 设置" }),
  );
});
