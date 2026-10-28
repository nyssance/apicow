import { t } from "@yaakapp-internal/lib/i18n";
import { showErrorToast } from "./toast";

/**
 * Handles a fire-and-forget promise by catching and reporting errors
 * via console.error and a toast notification.
 */
export function fireAndForget(promise: Promise<unknown>) {
  promise.catch((err: unknown) => {
    console.error("Unhandled async error:", err);
    showErrorToast({
      id: "async-error",
      title: t("Unexpected Error"),
      message: err instanceof Error ? err.message : String(err),
    });
  });
}
