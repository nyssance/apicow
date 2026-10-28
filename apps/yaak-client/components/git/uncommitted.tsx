import { t } from "@yaakapp-internal/lib/i18n";
import type { UncommittedChangesStrategy } from "@yaakapp-internal/git";
import { showConfirm } from "../../lib/confirm";

export async function promptUncommittedChangesStrategy(): Promise<UncommittedChangesStrategy> {
  const confirmed = await showConfirm({
    id: "git-uncommitted-changes",
    title: t("Uncommitted Changes"),
    description: t("You have uncommitted changes. Commit or reset your changes before pulling."),
    confirmText: t("Reset and Pull"),
    color: "danger",
  });
  return confirmed ? "reset" : "cancel";
}
