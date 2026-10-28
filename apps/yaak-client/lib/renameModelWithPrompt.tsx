import { t } from "@yaakapp-internal/lib/i18n";
import type { AnyModel } from "@yaakapp-internal/models";
import { patchModel } from "@yaakapp-internal/models";
import { InlineCode } from "@yaakapp-internal/ui";
import { showPrompt } from "./prompt";

export async function renameModelWithPrompt(model: Extract<AnyModel, { name: string }> | null) {
  if (model == null) {
    throw new Error("Tried to rename null model");
  }

  const name = await showPrompt({
    id: "rename-request",
    title: t("Rename Request"),
    required: false,
    description:
      model.name === "" ? (
        "Enter a new name"
      ) : (
        <>
          {t("Enter a new name for")}
          <InlineCode>{model.name}</InlineCode>
        </>
      ),
    label: t("Name"),
    placeholder: t("New Name"),
    defaultValue: model.name,
    confirmText: t("Save"),
  });

  if (name == null) return;

  await patchModel(model, { name });
}
