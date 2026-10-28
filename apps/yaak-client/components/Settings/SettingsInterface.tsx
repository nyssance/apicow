import { t } from "@yaakapp-internal/lib/i18n";
import { platform } from "@yaakapp-internal/platform";
import { useFonts } from "@yaakapp-internal/fonts";
import { useLicense } from "@yaakapp-internal/license";
import type { EditorKeymap, Settings } from "@yaakapp-internal/models";
import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { clamp, Heading, VStack } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { activeWorkspaceAtom } from "../../hooks/useActiveWorkspace";
import { showConfirm } from "../../lib/confirm";
import { pricingUrl } from "../../lib/pricingUrl";
import { rpc } from "../../lib/rpc";
import { CargoFeature } from "../CargoFeature";
import { Button } from "../core/Button";
import { Checkbox } from "../core/Checkbox";
import { Link } from "../core/Link";
import {
  ModelSettingRowBoolean,
  ModelSettingRowSelect,
  SettingRow,
  SettingRowBoolean,
  SettingRowSelect,
  SettingSelectControl,
  SettingsList,
  SettingsSection,
} from "../core/SettingRow";

const NULL_FONT_VALUE = "__NULL_FONT__";

const fontSizeOptions = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
].map((n) => ({ label: `${n}`, value: `${n}` }));

const keymaps: { value: EditorKeymap; label: string }[] = [
  { value: "default", label: t("Default") },
  { value: "vim", label: "Vim" },
  { value: "vscode", label: "VSCode" },
  { value: "emacs", label: "Emacs" },
];

export function SettingsInterface() {
  const workspace = useAtomValue(activeWorkspaceAtom);
  const settings = useAtomValue(settingsAtom);
  const fonts = useFonts();

  if (settings == null || workspace == null) {
    return null;
  }

  return (
    <VStack space={1.5} className="mb-4">
      <div className="mb-3">
        <Heading>{t("Interface")}</Heading>
        <p className="text-text-subtle">{t("Tweak settings related to the user interface.")}</p>
      </div>
      <SettingsList className="space-y-8">
        <SettingsSection title={t("Workspaces")}>
          <SettingRowSelect
            title={t("Open workspace behavior")}
            description={t("Choose what happens when opening another workspace.")}
            name="switchWorkspaceBehavior"
            value={
              settings.openWorkspaceNewWindow === true
                ? "new"
                : settings.openWorkspaceNewWindow === false
                  ? "current"
                  : "ask"
            }
            onChange={async (v) => {
              if (v === "current") await patchModel(settings, { openWorkspaceNewWindow: false });
              else if (v === "new") await patchModel(settings, { openWorkspaceNewWindow: true });
              else await patchModel(settings, { openWorkspaceNewWindow: null });
            }}
            options={[
              { label: t("Always ask"), value: "ask" },
              { label: t("Open in current window"), value: "current" },
              { label: t("Open in new window"), value: "new" },
            ]}
          />
        </SettingsSection>

        <SettingsSection title={t("Fonts")}>
          <SettingRow
            title={t("Interface font")}
            description={t("Font used for Yaak interface controls.")}
            controlClassName="gap-1"
          >
            {fonts.data && (
              <SettingSelectControl
                name="uiFont"
                label={t("Interface font")}
                selectClassName="w-72!"
                value={settings.interfaceFont ?? NULL_FONT_VALUE}
                defaultValue={NULL_FONT_VALUE}
                options={[
                  { label: t("System default"), value: NULL_FONT_VALUE },
                  ...fonts.data.uiFonts.map((f) => ({ label: f, value: f })),
                  ...fonts.data.editorFonts.map((f) => ({ label: f, value: f })),
                ]}
                onChange={async (v) => {
                  const interfaceFont = v === NULL_FONT_VALUE ? null : v;
                  await patchModel(settings, { interfaceFont });
                }}
              />
            )}
            <SettingSelectControl
              name="interfaceFontSize"
              label={t("Interface Font Size")}
              selectClassName="w-20!"
              value={`${settings.interfaceFontSize}`}
              defaultValue="14"
              options={fontSizeOptions}
              onChange={(v) => patchModel(settings, { interfaceFontSize: Number.parseInt(v, 10) })}
            />
          </SettingRow>

          <SettingRow
            title={t("Editor font")}
            description={t("Font used in request and response editors.")}
            controlClassName="gap-1"
          >
            {fonts.data && (
              <SettingSelectControl
                name="editorFont"
                label={t("Editor font")}
                selectClassName="w-72!"
                value={settings.editorFont ?? NULL_FONT_VALUE}
                defaultValue={NULL_FONT_VALUE}
                options={[
                  { label: t("System default"), value: NULL_FONT_VALUE },
                  ...fonts.data.editorFonts.map((f) => ({ label: f, value: f })),
                ]}
                onChange={async (v) => {
                  const editorFont = v === NULL_FONT_VALUE ? null : v;
                  await patchModel(settings, { editorFont });
                }}
              />
            )}
            <SettingSelectControl
              name="editorFontSize"
              label={t("Editor Font Size")}
              selectClassName="w-20!"
              value={`${settings.editorFontSize}`}
              defaultValue="12"
              options={fontSizeOptions}
              onChange={(v) =>
                patchModel(settings, {
                  editorFontSize: clamp(Number.parseInt(v, 10) || 14, 8, 30),
                })
              }
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title={t("Editor")}>
          <ModelSettingRowSelect
            model={settings}
            modelKey="editorKeymap"
            title={t("Editor keymap")}
            description={t("Keyboard shortcut preset used by text editors.")}
            options={keymaps}
          />
          <ModelSettingRowBoolean
            model={settings}
            modelKey="editorSoftWrap"
            title={t("Wrap editor lines")}
            description={t("Wrap long lines in request and response editors.")}
          />
          <ModelSettingRowBoolean
            model={settings}
            modelKey="coloredMethods"
            title={t("Colorize request methods")}
            description={t("Use method-specific colors for HTTP request methods.")}
          />
        </SettingsSection>

        <SettingsSection title={t("Window")}>
          <NativeTitlebarSetting settings={settings} />
          {platform.osType() !== "macos" && (
            <ModelSettingRowBoolean
              model={settings}
              modelKey="hideWindowControls"
              title={t("Hide window controls")}
              description={t(
                "Hide the close, maximize, and minimize controls on Windows or Linux.",
              )}
            />
          )}
        </SettingsSection>

        <CargoFeature feature="license">
          <LicenseSettings settings={settings} />
        </CargoFeature>
      </SettingsList>
    </VStack>
  );
}

function NativeTitlebarSetting({ settings }: { settings: Settings }) {
  const [nativeTitlebar, setNativeTitlebar] = useState(settings.useNativeTitlebar);

  return (
    <SettingRow
      title={t("Native title bar")}
      description={t("Use the operating system's standard title bar and window controls.")}
      controlClassName="gap-2"
    >
      <Checkbox
        hideLabel
        size="md"
        checked={nativeTitlebar}
        title={t("Native title bar")}
        onChange={setNativeTitlebar}
      />
      {settings.useNativeTitlebar !== nativeTitlebar && (
        <Button
          color="primary"
          size="xs"
          onClick={async () => {
            await patchModel(settings, { useNativeTitlebar: nativeTitlebar });
            await rpc("cmd_restart");
          }}
        >
          {t("Apply and Restart")}
        </Button>
      )}
    </SettingRow>
  );
}

function LicenseSettings({ settings }: { settings: Settings }) {
  const license = useLicense();
  if (license.check.data?.status !== "personal_use") {
    return null;
  }

  return (
    <SettingsSection title={t("License")}>
      <SettingRowBoolean
        checked={settings.hideLicenseBadge}
        title={t("Hide personal use badge")}
        description={t("Hide the personal-use badge from the interface.")}
        onChange={async (hideLicenseBadge) => {
          if (hideLicenseBadge) {
            const confirmed = await showConfirm({
              id: "hide-license-badge",
              title: t("Confirm Personal Use"),
              confirmText: t("Confirm"),
              description: (
                <VStack space={3}>
                  <p>{t("Hey there \ud83d\udc4b\ud83c\udffc")}</p>
                  <p>
                    {t("Yaak is free for personal projects and learning.")}{" "}
                    <strong>
                      {t("If you\u2019re using Yaak at work, a license is required.")}
                    </strong>
                  </p>
                  <p>
                    {t("Licenses help keep Yaak independent and sustainable.")}{" "}
                    <Link href={pricingUrl("app.license.badge-hide-confirm")}>
                      {t("Purchase a License \u2192")}
                    </Link>
                  </p>
                </VStack>
              ),
              requireTyping: "Personal Use",
              color: "info",
            });
            if (!confirmed) {
              return;
            }
          }
          await patchModel(settings, { hideLicenseBadge });
        }}
      />
    </SettingsSection>
  );
}
