import { t } from "@yaakapp-internal/lib/i18n";
import { useLicense } from "@yaakapp-internal/license";
import { Banner, HStack, Icon, VStack } from "@yaakapp-internal/ui";
import { differenceInDays } from "date-fns";
import { formatDate } from "date-fns/format";
import { useState } from "react";
import { useToggle } from "../../hooks/useToggle";
import { pricingUrl } from "../../lib/pricingUrl";
import { CargoFeature } from "../CargoFeature";
import { Button } from "../core/Button";
import { Link } from "../core/Link";
import { PlainInput } from "../core/PlainInput";
import { Separator } from "../core/Separator";
import { platform } from "@yaakapp-internal/platform";
import { pluralizeCount } from "@yaakapp-internal/lib/pluralize";

export function SettingsLicense() {
  return (
    <CargoFeature feature="license">
      <SettingsLicenseCmp />
    </CargoFeature>
  );
}

function SettingsLicenseCmp() {
  const { check, activate, deactivate } = useLicense();
  const [key, setKey] = useState<string>("");
  const [activateFormVisible, toggleActivateFormVisible] = useToggle(false);

  if (check.isPending) {
    return null;
  }

  const renderBanner = () => {
    if (!check.data) return null;

    switch (check.data.status) {
      case "active":
        return <Banner color="success">{t("Your license is active \ud83e\udd73")}</Banner>;

      case "trialing":
        return (
          <Banner color="info" className="max-w-lg">
            <p className="w-full">
              <strong>
                {pluralizeCount("day", differenceInDays(check.data.data.end, new Date()))}
              </strong>{" "}
              {t("left to evaluate Yaak for commercial use.")}
              <br />
              <span className="opacity-50">{t("Personal use is always free, forever.")}</span>
              <Separator className="my-2" />
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-notice">
                <Link noUnderline href={pricingUrl(`app.license.learn.${check.data.status}`)}>
                  {t("Learn More")}
                </Link>
              </div>
            </p>
          </Banner>
        );

      case "personal_use":
        return (
          <Banner color="notice" className="max-w-lg">
            <p className="w-full">
              {t("Your commercial-use trial has ended.")}
              <br />
              <span className="opacity-50">
                {t("You may continue using Yaak for personal use only.")}
                <br />
                {t("A license is required for commercial use.")}
              </span>
              <Separator className="my-2" />
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-notice">
                <Link noUnderline href={pricingUrl(`app.license.learn.${check.data.status}`)}>
                  {t("Learn More")}
                </Link>
              </div>
            </p>
          </Banner>
        );

      case "inactive":
        return (
          <Banner color="danger">
            {t("Your license is invalid. Please")}
            <Link href="https://yaak.app/dashboard">{t("Sign In")}</Link> {t("for more details")}
          </Banner>
        );

      case "expired":
        return (
          <Banner color="notice">
            {t("Your license expired")}{" "}
            <strong>{formatDate(check.data.data.periodEnd, "MMMM dd, yyyy")}</strong>
            {t(". Please")} <Link href="https://yaak.app/dashboard">{t("Resubscribe")}</Link>{" "}
            {t("to continue receiving updates.")}
            {check.data.data.changesUrl && (
              <>
                <br />
                <Link href={check.data.data.changesUrl}>{t("What's new in latest builds")}</Link>
              </>
            )}
          </Banner>
        );

      case "past_due":
        return (
          <Banner color="danger">
            <strong>{t("Your payment method needs attention.")}</strong>
            <br />
            {t("To re-activate your license, please")}{" "}
            <Link href={check.data.data.billingUrl}>{t("update your billing info")}</Link>.
          </Banner>
        );

      case "error":
        return (
          <Banner color="danger">
            {t("License check failed:")}
            {check.data.data.message} {" " + t("(Code:") + " "}
            {check.data.data.code})
          </Banner>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {renderBanner()}

      {check.error && <Banner color="danger">{check.error}</Banner>}
      {activate.error && <Banner color="danger">{activate.error}</Banner>}

      {check.data?.status === "active" ? (
        <HStack space={2}>
          <Button variant="border" color="secondary" size="sm" onClick={() => deactivate.mutate()}>
            {t("Deactivate License")}
          </Button>
          <Button
            color="secondary"
            size="sm"
            onClick={() =>
              platform.openUrl("https://yaak.app/dashboard?intent=app.license.support")
            }
            rightSlot={<Icon icon="external_link" />}
          >
            {t("Direct Support")}
          </Button>
        </HStack>
      ) : (
        <HStack space={2}>
          <Button variant="border" color="secondary" size="sm" onClick={toggleActivateFormVisible}>
            {t("Activate License")}
          </Button>
          <Button
            size="sm"
            color="primary"
            rightSlot={<Icon icon="external_link" />}
            onClick={() =>
              platform.openUrl(
                pricingUrl(`app.license.purchase.${check.data?.status ?? "unknown"}`),
              )
            }
          >
            {t("Purchase License")}
          </Button>
        </HStack>
      )}

      {activateFormVisible && (
        <VStack
          as="form"
          space={3}
          className="max-w-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            await activate.mutateAsync({ licenseKey: key });
            toggleActivateFormVisible();
          }}
        >
          <PlainInput
            autoFocus
            label={t("License Key")}
            name="key"
            onChange={setKey}
            placeholder="YK1-XXXXX-XXXXX-XXXXX-XXXXX"
          />
          <Button type="submit" color="primary" size="sm" isLoading={activate.isPending}>
            {t("Submit")}
          </Button>
        </VStack>
      )}
    </div>
  );
}
