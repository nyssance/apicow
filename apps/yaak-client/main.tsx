import { getLocale, localeStorageKey } from "@yaakapp-internal/lib/i18n";
import "./main.css";
import { RouterProvider } from "@tanstack/react-router";
import { platform } from "@yaakapp-internal/platform";
import {
  changeModelStoreWorkspace,
  initModelStore,
  flushAllModelWrites,
} from "@yaakapp-internal/models";
import { setPlatformOnDocument } from "@yaakapp-internal/theme";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initGit } from "./init/git";
import { initSync } from "./init/sync";
import { initGlobalListeners } from "./lib/initGlobalListeners";
import { jotaiStore } from "./lib/jotai";
import { router } from "./lib/router";

window.addEventListener("storage", (event) => {
  if (event.key !== localeStorageKey || (event.newValue !== "en" && event.newValue !== "zh-CN"))
    return;
  void flushAllModelWrites()
    .then(() => window.location.reload())
    .catch(console.error);
});
document.documentElement.lang = getLocale();
void platform.emit("apicub-locale", getLocale());

const osType = platform.osType();
setPlatformOnDocument(osType);

window.addEventListener("keydown", (e) => {
  const rx = /input|select|textarea/i;

  const target = e.target;
  if (e.key !== "Backspace") return;
  if (!(target instanceof Element)) return;
  if (target.getAttribute("contenteditable") !== null) return;

  if (
    !rx.test(target.tagName) ||
    ("disabled" in target && target.disabled) ||
    ("readOnly" in target && target.readOnly)
  ) {
    e.preventDefault();
  }
});

// Initialize a bunch of watchers
initGit();
initSync();
initModelStore(jotaiStore);
initGlobalListeners();
await changeModelStoreWorkspace(null); // Load global models

console.log("Creating React root");
createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
