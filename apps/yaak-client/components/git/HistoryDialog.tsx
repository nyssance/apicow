import { t } from "@yaakapp-internal/lib/i18n";
import { useGitLog } from "@yaakapp-internal/git";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TruncatedWideTableCell,
} from "@yaakapp-internal/ui";

export function HistoryDialog({ dir }: { dir: string }) {
  const log = useGitLog(dir);

  return (
    <div className="pl-5 pr-1 pb-1">
      <Table scrollable className="px-1">
        <TableHead>
          <TableRow>
            <TableHeaderCell>{t("Message")}</TableHeaderCell>
            <TableHeaderCell>{t("Author")}</TableHeaderCell>
            <TableHeaderCell>{t("When")}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(log.data ?? []).map((l) => (
            <TableRow key={l.oid}>
              <TruncatedWideTableCell>
                {l.message || <em className="text-text-subtle">{t("No message")}</em>}
              </TruncatedWideTableCell>
              <TableCell>
                <span title={t("Email: {{p0}}", { p0: String(l.author.email) })}>
                  {l.author.name || t("Unknown")}
                </span>
              </TableCell>
              <TableCell className="text-text-subtle">
                <span title={l.when}>
                  {formatDistanceToNowStrict(l.when)} {" " + t("ago")}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
