import { t } from "@yaakapp-internal/lib/i18n";
import type { Folder } from "@yaakapp-internal/models";
import { modelTypeLabel, patchModel } from "@yaakapp-internal/models";
import { HStack, Icon, InlineCode, IconTooltip } from "@yaakapp-internal/ui";
import { useMemo } from "react";
import { openFolderSettings } from "../commands/openFolderSettings";
import { openWorkspaceSettings } from "../commands/openWorkspaceSettings";
import type { RadioDropdownProps } from "../components/core/RadioDropdown";
import type { TabItem } from "../components/core/Tabs/Tabs";
import { capitalize } from "../lib/capitalize";
import { showConfirm } from "../lib/confirm";
import { resolvedModelName } from "../lib/resolvedModelName";
import { useHttpAuthenticationSummaries } from "./useHttpAuthentication";
import type { AuthenticatedModel } from "./useInheritedAuthentication";
import { useInheritedAuthentication } from "./useInheritedAuthentication";
import { useModelAncestors } from "./useModelAncestors";

export function useAuthTab<T extends string>(tabValue: T, model: AuthenticatedModel | null) {
  const options = useAuthDropdownOptions(model);

  return useMemo<TabItem[]>(() => {
    if (model == null || options == null) return [];

    const tab: TabItem = {
      value: tabValue,
      label: t("Auth"),
      options,
    };

    return [tab];
  }, [model, options, tabValue]);
}

export function useAuthDropdownOptions(
  model: AuthenticatedModel | null,
): Omit<RadioDropdownProps, "children"> | null {
  const authentication = useHttpAuthenticationSummaries();
  const inheritedAuth = useInheritedAuthentication(model);
  const ancestors = useModelAncestors(model);
  const parentModel = ancestors[0] ?? null;

  return useMemo(() => {
    if (model == null) return null;

    return {
      value: model.authenticationType,
      items: [
        ...authentication.map((a) => ({
          label: a.label ? t(a.label) : t("Unknown"),
          shortLabel: a.shortLabel,
          value: a.name,
        })),
        { type: "separator" },
        {
          label: t("Inherit from Parent"),
          shortLabel:
            inheritedAuth != null && inheritedAuth.authenticationType !== "none" ? (
              <HStack space={1.5}>
                {authentication.find((a) => a.name === inheritedAuth.authenticationType)
                  ?.shortLabel ?? "UNKNOWN"}
                <IconTooltip
                  icon="zap_off"
                  iconSize="xs"
                  content={t("Authentication was inherited from an ancestor")}
                />
              </HStack>
            ) : (
              t("Auth")
            ),
          value: null,
        },
        { label: t("No Auth"), shortLabel: t("No Auth"), value: "none" },
      ],
      itemsAfter: (() => {
        const actions: (
          | { type: "separator"; label: string }
          | {
              label: string;
              leftSlot: React.ReactNode;
              onSelect: () => Promise<void>;
            }
        )[] = [];

        // Promote: move auth from current model up to parent
        if (
          parentModel &&
          model.authenticationType &&
          model.authenticationType !== "none" &&
          (parentModel.authenticationType == null || parentModel.authenticationType === "none")
        ) {
          actions.push(
            { type: "separator", label: t("Actions") },
            {
              label: t("Promote to {{p0}}", { p0: String(capitalize(parentModel.model)) }),
              leftSlot: (
                <Icon icon={parentModel.model === "workspace" ? "corner_right_up" : "folder_up"} />
              ),
              onSelect: async () => {
                const confirmed = await showConfirm({
                  id: "promote-auth-confirm",
                  title: t("Promote Authentication"),
                  confirmText: t("Promote"),
                  description: (
                    <>
                      {t("Move authentication config to")}{" "}
                      <InlineCode>{resolvedModelName(parentModel)}</InlineCode>?
                    </>
                  ),
                });
                if (confirmed) {
                  await patchModel(model, {
                    authentication: {},
                    authenticationType: null,
                  });
                  await patchModel(parentModel, {
                    authentication: model.authentication,
                    authenticationType: model.authenticationType,
                  });

                  if (parentModel.model === "folder") {
                    openFolderSettings(parentModel.id, "auth");
                  } else {
                    openWorkspaceSettings("auth");
                  }
                }
              },
            },
          );
        }

        // Copy from ancestor: copy auth config down to current model
        const ancestorWithAuth = ancestors.find(
          (a) => a.authenticationType != null && a.authenticationType !== "none",
        );
        if (ancestorWithAuth) {
          if (actions.length === 0) {
            actions.push({ type: "separator", label: t("Actions") });
          }
          actions.push({
            label: t("Copy from {{p0}}", { p0: String(modelTypeLabel(ancestorWithAuth)) }),
            leftSlot: (
              <Icon
                icon={ancestorWithAuth.model === "workspace" ? "corner_right_down" : "folder_down"}
              />
            ),
            onSelect: async () => {
              const confirmed = await showConfirm({
                id: "copy-auth-confirm",
                title: t("Copy Authentication"),
                confirmText: t("Copy"),
                description: (
                  <>
                    {t("Copy")}{" "}
                    {authentication.find((a) => a.name === ancestorWithAuth.authenticationType)
                      ?.label ?? "authentication"}{" "}
                    {t("config from")}{" "}
                    <InlineCode>{resolvedModelName(ancestorWithAuth)}</InlineCode>
                    {t("? This will override the current authentication but will not affect the")}
                    {modelTypeLabel(ancestorWithAuth).toLowerCase()}.
                  </>
                ),
              });
              if (confirmed) {
                await patchModel(model, {
                  authentication: { ...ancestorWithAuth.authentication },
                  authenticationType: ancestorWithAuth.authenticationType,
                });
              }
            },
          });
        }

        return actions.length > 0 ? actions : undefined;
      })(),
      onChange: async (authenticationType) => {
        let authentication: Folder["authentication"] = model.authentication;
        if (model.authenticationType !== authenticationType) {
          authentication = {
            // Reset auth if changing types
          };
        }
        await patchModel(model, { authentication, authenticationType });
      },
    };
  }, [authentication, inheritedAuth, model, parentModel, ancestors]);
}
