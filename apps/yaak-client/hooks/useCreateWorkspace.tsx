import { t } from "@yaakapp-internal/lib/i18n";
import { useCallback } from "react";
import { CreateWorkspaceDialog } from "../components/CreateWorkspaceDialog";
import { showDialog } from "../lib/dialog";

export function useCreateWorkspace() {
  return useCallback(() => {
    showDialog({
      id: "create-workspace",
      title: t("Create Workspace"),
      size: "sm",
      render: ({ hide }) => <CreateWorkspaceDialog hide={hide} />,
    });
  }, []);
}
