import { t } from "@yaakapp-internal/lib/i18n";
import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import type { ProxySetting } from "@yaakapp-internal/models";
import { Heading, InlineCode, VStack } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { CommercialUseBanner } from "../CommercialUseBanner";
import {
  SettingRowBoolean,
  SettingRowSelect,
  SettingRowText,
  SettingsList,
  SettingsSection,
} from "../core/SettingRow";

export function SettingsProxy() {
  const settings = useAtomValue(settingsAtom);
  const proxy = enabledProxyOrDefault(settings.proxy);

  const patchProxy = async (patch: Partial<EnabledProxySetting>) => {
    await patchModel(settings, {
      proxy: {
        ...proxy,
        ...patch,
        auth: Object.hasOwn(patch, "auth") ? (patch.auth ?? null) : proxy.auth,
      },
    });
  };

  return (
    <VStack space={1.5} className="mb-4">
      <div className="mb-3">
        <Heading>{t("Proxy")}</Heading>
        <p className="text-text-subtle">
          {t(
            "Configure a proxy server for HTTP requests. Useful for corporate firewalls, debugging traffic, or routing through specific infrastructure.",
          )}
        </p>
      </div>
      <CommercialUseBanner source="proxy-settings" title={t("Using a proxy for work?")} />
      <SettingsList className="space-y-8">
        <SettingsSection title={t("Proxy")}>
          <SettingRowSelect
            title={t("Proxy")}
            description={t("Choose how Yaak should discover or use proxy settings.")}
            name="proxy"
            value={settings.proxy?.type ?? "automatic"}
            onChange={async (v) => {
              if (v === "automatic") {
                await patchModel(settings, { proxy: undefined });
              } else if (v === "enabled") {
                await patchModel(settings, { proxy });
              } else {
                await patchModel(settings, { proxy: { type: "disabled" } });
              }
            }}
            options={[
              { label: t("Automatic proxy detection"), value: "automatic" },
              { label: t("Custom proxy configuration"), value: "enabled" },
              { label: t("No proxy"), value: "disabled" },
            ]}
            selectClassName="w-64!"
          />
        </SettingsSection>

        {settings.proxy?.type === "enabled" && (
          <>
            <SettingsSection title={t("Custom Proxy")}>
              <SettingRowBoolean
                checked={!settings.proxy.disabled}
                title={t("Enable proxy")}
                description={t("Temporarily disable the proxy without losing the configuration.")}
                onChange={(enabled) => patchProxy({ disabled: !enabled })}
              />
              <SettingRowText
                name="proxyHttp"
                title={
                  <>
                    {t("Proxy for")}
                    <InlineCode>http://</InlineCode> {t("traffic")}
                  </>
                }
                description={t("Proxy host used for unencrypted HTTP traffic.")}
                value={settings.proxy.http}
                placeholder="localhost:9090"
                onChange={(http) => patchProxy({ http })}
              />
              <SettingRowText
                name="proxyHttps"
                title={
                  <>
                    {t("Proxy for")}
                    <InlineCode>https://</InlineCode> {t("traffic")}
                  </>
                }
                description={t("Proxy host used for HTTPS traffic.")}
                value={settings.proxy.https}
                placeholder="localhost:9090"
                onChange={(https) => patchProxy({ https })}
              />
              <SettingRowText
                name="proxyBypass"
                title={t("Proxy Bypass")}
                description={t("Comma-separated list of hosts that should bypass the proxy.")}
                value={settings.proxy.bypass}
                placeholder="127.0.0.1, *.example.com, localhost:3000"
                inputWidthClassName="w-96!"
                onChange={(bypass) => patchProxy({ bypass })}
              />
            </SettingsSection>

            <SettingsSection title={t("Authentication")}>
              <SettingRowBoolean
                checked={settings.proxy.auth != null}
                title={t("Enable authentication")}
                description={t("Send proxy credentials with proxied requests.")}
                onChange={(enabled) =>
                  patchProxy({ auth: enabled ? { user: "", password: "" } : null })
                }
              />

              {settings.proxy.auth != null && (
                <>
                  <SettingRowText
                    required
                    name="proxyUser"
                    title={t("User")}
                    description={t("Username for proxy authentication.")}
                    value={settings.proxy.auth.user}
                    placeholder="myUser"
                    onChange={(user) =>
                      patchProxy({
                        auth: {
                          user,
                          password:
                            settings.proxy?.type === "enabled"
                              ? (settings.proxy.auth?.password ?? "")
                              : "",
                        },
                      })
                    }
                  />
                  <SettingRowText
                    name="proxyPassword"
                    title={t("Password")}
                    description={t("Password for proxy authentication.")}
                    value={settings.proxy.auth.password}
                    placeholder="s3cretPassw0rd"
                    type="password"
                    onChange={(password) =>
                      patchProxy({
                        auth: {
                          user:
                            settings.proxy?.type === "enabled"
                              ? (settings.proxy.auth?.user ?? "")
                              : "",
                          password,
                        },
                      })
                    }
                  />
                </>
              )}
            </SettingsSection>
          </>
        )}
      </SettingsList>
    </VStack>
  );
}

type EnabledProxySetting = Extract<ProxySetting, { type: "enabled" }>;

function enabledProxyOrDefault(proxy: ProxySetting | null): EnabledProxySetting {
  if (proxy?.type === "enabled") return proxy;

  return {
    disabled: false,
    type: "enabled",
    http: "",
    https: "",
    auth: { user: "", password: "" },
    bypass: "",
  };
}
