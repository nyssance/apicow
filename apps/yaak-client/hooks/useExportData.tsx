import { t } from "@yaakapp-internal/lib/i18n";
import { workspacesAtom } from "@yaakapp-internal/models";
import { ExportDataDialog } from "../components/ExportDataDialog";
import { showAlert } from "../lib/alert";
import { showDialog } from "../lib/dialog";
import { jotaiStore } from "../lib/jotai";
import { showToast } from "../lib/toast";
import { activeWorkspaceAtom } from "./useActiveWorkspace";
import { useFastMutation } from "./useFastMutation";

export function useExportData() {
  return useFastMutation({
    mutationKey: ["export_data"],
    onError: (err: string) => {
      showAlert({ id: "export-failed", title: t("Export Failed"), body: err });
    },
    mutationFn: async () => {
      const activeWorkspace = jotaiStore.get(activeWorkspaceAtom);
      const workspaces = jotaiStore.get(workspacesAtom);

      if (activeWorkspace == null || workspaces.length === 0) return;

      showDialog({
        id: "export-data",
        title: t("Export Data"),
        size: "md",
        render: ({ hide }) => (
          <ExportDataDialog
            onHide={hide}
            onSuccess={() => {
              showToast({
                color: "success",
                message: t("Data export successful"),
              });
            }}
          />
        ),
      });
    },
  });
}
