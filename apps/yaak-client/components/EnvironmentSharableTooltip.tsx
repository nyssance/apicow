import { t } from "@yaakapp-internal/lib/i18n";
import { IconTooltip } from "@yaakapp-internal/ui";

export function EnvironmentSharableTooltip() {
  return (
    <IconTooltip
      content={t("Sharable environments are included in Directory Sync and data export.")}
    />
  );
}
