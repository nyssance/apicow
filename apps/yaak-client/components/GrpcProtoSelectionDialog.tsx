import { t } from "@yaakapp-internal/lib/i18n";
import type { GrpcRequest } from "@yaakapp-internal/models";
import { Banner, InlineCode, VStack } from "@yaakapp-internal/ui";
import { useActiveRequest } from "../hooks/useActiveRequest";
import { useGrpc } from "../hooks/useGrpc";
import { useGrpcProtoFiles } from "../hooks/useGrpcProtoFiles";
import { DialogFooter } from "./core/Dialog";
import { PathList } from "./core/PathList";
import { Link } from "./core/Link";
import { platform } from "@yaakapp-internal/platform";
import { pluralizeCount } from "@yaakapp-internal/lib/pluralize";

interface Props {
  onDone: () => void;
}

export function GrpcProtoSelectionDialog(props: Props) {
  const request = useActiveRequest();
  if (request?.model !== "grpc_request") return null;

  return <GrpcProtoSelectionDialogWithRequest request={request} {...props} />;
}

function GrpcProtoSelectionDialogWithRequest({
  request,
  onDone,
}: Props & { request: GrpcRequest }) {
  const protoFilesKv = useGrpcProtoFiles(request.id);
  const protoFiles = protoFilesKv.value ?? [];
  const grpc = useGrpc(request, null, protoFiles);
  const services = grpc.reflect.data;
  const serverReflection = protoFiles.length === 0 && services != null;
  let reflectError = grpc.reflect.error ?? null;
  const reflectionUnimplemented = String(reflectError).match(/unimplemented/i);

  if (reflectionUnimplemented) {
    reflectError = null;
  }

  if (request == null) {
    return null;
  }

  return (
    <>
      <VStack space={5} className="pb-4">
        {reflectError && (
          <Banner color="warning">
            <h1 className="font-bold">
              {t("Reflection failed on URL")}
              <InlineCode>{request.url || "n/a"}</InlineCode>
            </h1>
            <p>{reflectError.trim()}</p>
          </Banner>
        )}
        {!serverReflection && services != null && services.length > 0 && (
          <Banner className="flex flex-col gap-2">
            <p>
              {t("Found services")}{" "}
              {services?.slice(0, 5).map((s, i) => {
                return (
                  <span key={s.name + s.methods.map((m) => m.name).join(",")}>
                    <InlineCode>{s.name}</InlineCode>
                    {i === services.length - 1 ? "" : i === services.length - 2 ? t(" and ") : ", "}
                  </span>
                );
              })}
              {services?.length > 5 && pluralizeCount("other", services?.length - 5)}
            </p>
          </Banner>
        )}
        {serverReflection && services != null && services.length > 0 && (
          <Banner className="flex flex-col gap-2">
            <p>
              {t("Server reflection found services")}
              {services?.map((s, i) => {
                return (
                  <span key={s.name + s.methods.map((m) => m.name).join(",")}>
                    <InlineCode>{s.name}</InlineCode>
                    {i === services.length - 1 ? "" : i === services.length - 2 ? t(" and ") : ", "}
                  </span>
                );
              })}
              {t(". You can override this schema by manually selecting")}
              <InlineCode>*.proto</InlineCode> {t("files.")}
            </p>
          </Banner>
        )}

        <PathList
          items={protoFiles.map((path) => ({
            path,
            icon: path.endsWith(".proto") ? "file_code" : "folder_code",
          }))}
          onRemove={async (path) => {
            await protoFilesKv.set(protoFiles.filter((p) => p !== path));
            await grpc.reflect.refetch();
          }}
          addLabel={t("Add proto files or an import folder")}
          addItems={[
            {
              label: t("Proto files"),
              icon: "file_code",
              onSelect: async () => {
                const selected = await platform.dialog.open({
                  title: t("Select Proto Files"),
                  multiple: true,
                  filters: [{ name: t("Proto Files"), extensions: ["proto"] }],
                });
                if (selected == null) return;
                const newFiles = selected.filter((p) => !protoFiles.includes(p));
                await protoFilesKv.set([...protoFiles, ...newFiles]);
                await grpc.reflect.refetch();
              },
            },
            {
              label: t("Import folder"),
              icon: "folder_code",
              onSelect: async () => {
                const selected = await platform.dialog.open({
                  title: t("Select Proto Directory"),
                  directory: true,
                });
                if (selected == null) return;
                await protoFilesKv.set([...protoFiles.filter((f) => f !== selected), selected]);
                await grpc.reflect.refetch();
              },
            },
          ]}
        />
        {reflectionUnimplemented && protoFiles.length === 0 && (
          <Banner>
            <InlineCode>{request.url}</InlineCode> {" " + t("doesn't implement")}{" "}
            <Link href="https://github.com/grpc/grpc/blob/9aa3c5835a4ed6afae9455b63ed45c761d695bca/doc/server-reflection.md">
              {t("Server Reflection")}
            </Link>{" "}
            {t(". Please manually add the")}
            <InlineCode>.proto</InlineCode> {t("file to get started.")}
          </Banner>
        )}
      </VStack>
      <DialogFooter
        actions={[
          {
            label: t("Refresh Schema"),
            isLoading: grpc.reflect.isFetching,
            disabled: grpc.reflect.isFetching,
            onClick: () => grpc.reflect.refetch(),
          },
          { label: t("Done"), color: "primary", onClick: onDone },
        ]}
      />
    </>
  );
}
