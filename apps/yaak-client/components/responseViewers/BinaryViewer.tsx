import { t } from "@yaakapp-internal/lib/i18n";
import type { HttpResponse } from "@yaakapp-internal/models";
import { useSaveResponse } from "../../hooks/useSaveResponse";
import { getContentTypeFromHeaders } from "../../lib/model_util";
import { Button } from "../core/Button";
import { Banner, InlineCode, LoadingIcon } from "@yaakapp-internal/ui";
import { EmptyStateText } from "../EmptyStateText";

interface Props {
  response: HttpResponse;
}

export function BinaryViewer({ response }: Props) {
  const saveResponse = useSaveResponse(response);
  const contentType = getContentTypeFromHeaders(response.headers) ?? "unknown";

  // Wait until the response has been fully-downloaded
  if (response.state !== "closed") {
    return (
      <EmptyStateText>
        <LoadingIcon size="sm" />
      </EmptyStateText>
    );
  }

  return (
    <Banner color="primary" className="h-full flex flex-col gap-3">
      <p>
        {t("Content type")}
        <InlineCode>{contentType}</InlineCode> {t("cannot be previewed")}
      </p>
      <div>
        <Button variant="border" size="sm" onClick={() => saveResponse.mutate()}>
          {t("Save to File")}
        </Button>
      </div>
    </Banner>
  );
}
