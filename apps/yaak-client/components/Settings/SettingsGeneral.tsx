import { getLocale, localeStorageKey } from "@yaakapp-internal/lib/i18n";
import { flushAllModelWrites } from "@yaakapp-internal/models";
import { t } from "@yaakapp-internal/lib/i18n";
import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { Heading, VStack } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { useCheckForUpdates } from "../../hooks/useCheckForUpdates";
import { appInfo } from "../../lib/appInfo";
import { revealInFinderText } from "../../lib/reveal";
import { CargoFeature } from "../CargoFeature";
import { CommercialUseBanner } from "../CommercialUseBanner";
import { DismissibleBanner } from "../core/DismissibleBanner";
import { IconButton } from "../core/IconButton";
import { platform } from "@yaakapp-internal/platform";
import {
  ModelSettingRowBoolean,
  ModelSettingSelectControl,
  SettingValue,
  SettingRow,
  SettingRowBoolean,
  SettingRowSelect,
  SettingsList,
  SettingsSection,
} from "../core/SettingRow";

const WORKSPACE_SETTINGS_MOVED_AT = "2026-06-30";

export function SettingsGeneral() {
  const settings = useAtomValue(settingsAtom);
  const checkForUpdates = useCheckForUpdates();

  if (settings == null) {
    return null;
  }

  const showWorkspaceSettingsMovedBanner =
    settings.createdAt.slice(0, 10) < WORKSPACE_SETTINGS_MOVED_AT;

  return (
    <VStack space={1.5} className="mb-4">
      <div>
        <Heading>{t("General")}</Heading>
        <p className="text-text-subtle">
          {t("Configure general settings for update behavior and more.")}
        </p>
      </div>
      <div className="mt-3 mb-5">
        <CommercialUseBanner source="settings-general" title={t("Using Yaak for work?")} />
      </div>
      <SettingsList className="space-y-8">
        <SettingsSection title={t("Language")}>
          <SettingRowSelect
            title={t("Language")}
            description={t(
              "Choose the interface language. Changes apply after reloading this window.",
            )}
            name="interfaceLanguage"
            value={getLocale()}
            options={[
              { label: "简体中文", value: "zh-CN" },
              { label: "English", value: "en" },
            ]}
            onChange={async (value) => {
              if (value !== "zh-CN" && value !== "en") return;
              await flushAllModelWrites();
              localStorage.setItem(localeStorageKey, value);
              window.location.reload();
            }}
          />
        </SettingsSection>
        <CargoFeature feature="updater">
          <SettingsSection title={t("Updates")}>
            <SettingRow
              title={t("Update Channel")}
              description={t("Choose whether Yaak should use stable releases or beta releases.")}
            >
              <div className="grid grid-cols-[12rem_auto] gap-1">
                <ModelSettingSelectControl
                  model={settings}
                  modelKey="updateChannel"
                  label={t("Update Channel")}
                  selectClassName="w-full!"
                  options={[
                    { label: t("Stable"), value: "stable" },
                    { label: t("Beta"), value: "beta" },
                  ]}
                />
                <IconButton
                  variant="border"
                  size="sm"
                  title={t("Check for updates")}
                  icon="refresh"
                  spin={checkForUpdates.isPending}
                  onClick={() => checkForUpdates.mutateAsync()}
                />
              </div>
            </SettingRow>

            <SettingRowSelect
              title={t("Update Behavior")}
              description={t("Choose whether updates are installed automatically or manually.")}
              name="autoupdate"
              value={settings.autoupdate ? "auto" : "manual"}
              onChange={(v) => patchModel(settings, { autoupdate: v === "auto" })}
              options={[
                { label: t("Automatic"), value: "auto" },
                { label: t("Manual"), value: "manual" },
              ]}
            />

            <ModelSettingRowBoolean
              model={settings}
              modelKey="autoDownloadUpdates"
              title={t("Automatically download updates")}
              description={t(
                "Download Yaak updates in the background so they are ready to install.",
              )}
              disabled={!settings.autoupdate}
            />

            <ModelSettingRowBoolean
              model={settings}
              modelKey="checkNotifications"
              title={t("Check for notifications")}
              description={t("Periodically ping Yaak servers to check for relevant notifications.")}
            />

            <SettingRowBoolean
              title={t("Send anonymous usage statistics")}
              description={t("Yaak is local-first and does not collect analytics or usage data.")}
              disabled
              checked={false}
              onChange={() => {}}
            />
          </SettingsSection>
        </CargoFeature>

        <CargoFeature feature="license">
          <SettingsSection title={t("Feedback")}>
            <SettingRowBoolean
              title={t("Prompt for feedback")}
              description={t("Show rare one-time prompts asking how new features are working.")}
              checked={settings.promptFeedback}
              onChange={(promptFeedback) => patchModel(settings, { promptFeedback })}
            />
          </SettingsSection>
        </CargoFeature>

        {showWorkspaceSettingsMovedBanner && (
          <DismissibleBanner
            id="workspace-settings-moved-2026-06-30"
            color="info"
            className="w-full p-4 max-w-xl mr-auto"
          >
            <p>
              {t("Workspace specific settings have moved to")} <b>{t("Workspace Settings")}</b>
              {t(", accessible from the workspace switcher menu.")}
            </p>
          </DismissibleBanner>
        )}

        <SettingsSection title={t("App Info")}>
          <SettingRow title={t("Version")} description={t("Current Yaak version.")}>
            <SettingValue value={appInfo.version} />
          </SettingRow>
          <SettingRow
            title={t("Data Directory")}
            description={t("Where Yaak stores application data.")}
            controlClassName="min-w-0 max-w-[min(42rem,55vw)] gap-2"
          >
            <SettingValue
              value={appInfo.appDataDir}
              actions={[
                {
                  title: revealInFinderText,
                  icon: "folder_open",
                  onClick: () => platform.revealItemInDir(appInfo.appDataDir),
                },
              ]}
            />
          </SettingRow>
          <SettingRow
            title={t("Logs Directory")}
            description={t("Where Yaak writes application logs.")}
            controlClassName="min-w-0 max-w-[min(42rem,55vw)] gap-2"
          >
            <SettingValue
              value={appInfo.appLogDir}
              actions={[
                {
                  title: revealInFinderText,
                  icon: "folder_open",
                  onClick: () => platform.revealItemInDir(appInfo.appLogDir),
                },
              ]}
            />
          </SettingRow>
        </SettingsSection>
      </SettingsList>
    </VStack>
  );
}
