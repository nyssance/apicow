import { beforeEach, vi } from "vite-plus/test";

// Browser-facing unit tests use a deterministic locale on every host runtime.
function installBrowserLocale() {
  vi.stubGlobal("navigator", { language: "en-US", languages: ["en-US"] });
}

installBrowserLocale();
beforeEach(installBrowserLocale);
