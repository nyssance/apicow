import { t } from "@yaakapp-internal/lib/i18n";
import { HStack, VStack } from "@yaakapp-internal/ui";
import { useRef, useState } from "react";
import type { FeedbackFeature } from "../lib/featureFeedbackConstants";
import { FEEDBACK_FEATURES } from "../lib/featureFeedbackConstants";
import { rpc } from "../lib/rpc";
import { hideToastById, showToast } from "../lib/toast";
import { Button } from "./core/Button";
import { Input } from "./core/Input";

interface Props {
  feature: FeedbackFeature;
  onDone: () => void;
}

export function FeedbackToast({ feature, onDone }: Props) {
  const [text, setText] = useState<string>("");
  const [sent, setSent] = useState(false);
  const sentRef = useRef(false);

  const handleDismiss = () => {
    onDone();
    hideToastById(`feature-feedback-${feature}`);
  };

  const handleSend = async () => {
    const trimmedText = text.trim();
    if (sentRef.current || trimmedText.length === 0) return;

    sentRef.current = true;
    setSent(true);
    try {
      await rpc("cmd_send_feedback", { feature, text: trimmedText });
      onDone();
      showToast({
        id: `feature-feedback-${feature}`,
        timeout: 5000,
        color: "info",
        message: t("Finish submitting your feedback on GitHub."),
      });
    } catch (err) {
      sentRef.current = false;
      setSent(false);
      showToast({ color: "danger", message: String(err) });
    }
  };

  return (
    <VStack space={2}>
      <p className="text-sm font-semibold">{FEEDBACK_FEATURES[feature]}</p>
      <div className="h-20">
        <Input
          size="xs"
          // The editor forces its mono font on the scroller, so the override
          // has to target it directly
          className="[&_.cm-scroller]:font-sans! [&_.cm-scroller]:text-sm!"
          label={t("Feedback")}
          hideLabel
          stateKey={null}
          multiLine
          fullHeight
          placeholder={t("Your thoughts...")}
          onChange={setText}
        />
      </div>
      <HStack space={1.5} justifyContent="end">
        <Button size="xs" color="secondary" variant="border" onClick={handleDismiss}>
          {t("Dismiss")}
        </Button>
        <Button
          size="xs"
          color="primary"
          disabled={sent || text.trim().length === 0}
          onClick={handleSend}
        >
          {t("Continue on GitHub")}
        </Button>
      </HStack>
    </VStack>
  );
}
