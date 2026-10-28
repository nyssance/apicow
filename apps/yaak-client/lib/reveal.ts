import { t } from "@yaakapp-internal/lib/i18n";
import { platform } from "@yaakapp-internal/platform";

const os = platform.osType();
export const revealInFinderText =
  os === "macos"
    ? t("Reveal in Finder")
    : os === "windows"
      ? t("Show in Explorer")
      : t("Show in File Manager");
