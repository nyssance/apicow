import { t } from "@yaakapp-internal/lib/i18n";
import type { HttpRequest } from "@yaakapp-internal/models";
import { patchModel } from "@yaakapp-internal/models";
import { Banner, HStack, InlineCode, SizeTag } from "@yaakapp-internal/ui";
import type { ReactNode } from "react";
import { useToggle } from "../hooks/useToggle";
import { showConfirm } from "../lib/confirm";
import { Button } from "./core/Button";

interface Props {
  children: ReactNode;
  request: HttpRequest;
}

const LARGE_TEXT_BYTES = 2 * 1000 * 1000;

export function ConfirmLargeRequestBody({ children, request }: Props) {
  const [showLargeResponse, toggleShowLargeResponse] = useToggle();

  if (request.body?.text == null) {
    return children;
  }

  const contentLength = request.body.text.length ?? 0;
  const tooLargeBytes = LARGE_TEXT_BYTES;
  const isLarge = contentLength > tooLargeBytes;
  if (!showLargeResponse && isLarge) {
    return (
      <Banner color="primary" className="flex flex-col gap-3">
        <p>
          {t("Rendering content over")}{" "}
          <InlineCode>
            <SizeTag contentLength={tooLargeBytes} />
          </InlineCode>{" "}
          {t("may impact performance.")}
        </p>
        <HStack wrap space={2}>
          <Button color="primary" size="xs" onClick={toggleShowLargeResponse}>
            {t("Reveal Body")}
          </Button>
          <Button
            color="danger"
            size="xs"
            variant="border"
            onClick={async () => {
              const confirm = await showConfirm({
                id: `delete-body-${request.id}`,
                confirmText: t("Delete Body"),
                title: t("Delete Body Text"),
                description: t("Are you sure you want to delete the request body text?"),
                color: "danger",
              });
              if (confirm) {
                await patchModel(request, { body: { ...request.body, text: "" } });
              }
            }}
          >
            {t("Delete Body")}
          </Button>
        </HStack>
      </Banner>
    );
  }

  return <>{children}</>;
}
