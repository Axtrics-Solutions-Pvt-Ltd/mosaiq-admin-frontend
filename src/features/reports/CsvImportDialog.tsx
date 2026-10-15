"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  LoaderCircle,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { type DragEvent, useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { reportSettingsUrl } from "@/config/routes";
import { ApiError } from "@/lib/api/errors";
import { reportPaths } from "@/lib/api/paths";
import { formatNumber } from "@/lib/formatters";

import type { ReportScope } from "./api";
import {
  type CsvImportFile,
  csvImportProblem,
  type CsvImportResult,
  type CsvImportStatus,
  type LayoutItem,
  type Report,
} from "./contracts";
import {
  chosenFileKey,
  csvResultKey,
  csvReviewRows,
  csvTemplateFormats,
  hiddenScopeNote,
  isFileLevelError,
  isUnknownAudienceError,
  readyCardCodes,
  todayIsoDate,
} from "./csv-import";
import { CsvTemplateDownload } from "./CsvTemplateDownload";
import { useCsvImportApply, useCsvImportPreview } from "./queries";

type VisibleStatus = Exclude<CsvImportStatus, "ignored">;

const statusBadges: Record<
  VisibleStatus,
  { label: string; tone: "success" | "danger" | "neutral" | "warning" }
> = {
  ready: { label: "Ready", tone: "success" },
  invalid: { label: "Errors", tone: "danger" },
  skipped: { label: "Skipped – no rows", tone: "neutral" },
  unrecognised: { label: "Not recognised", tone: "warning" },
  out_of_scope: { label: "Not in this section", tone: "warning" },
  duplicate: { label: "Duplicate", tone: "warning" },
};

function StatusBadge({ status }: { status: CsvImportStatus }) {
  if (status === "ignored") return null;
  const badge = statusBadges[status];
  return <Badge tone={badge.tone}>{badge.label}</Badge>;
}

const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAccessError(error: unknown) {
  return (
    error instanceof ApiError && (error.status === 403 || error.status === 404)
  );
}

// A refused upload names its problem on `files`, or on `cards` when a card
// Apply named is no longer ready; anything else is a safe general message.
function uploadError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 422)
    return (
      error.fieldErrors.cards ??
      error.fieldErrors.files ??
      Object.values(error.fieldErrors)[0] ??
      error.message
    );
  return error.status === 0 || error.status >= 500 ? fallback : error.message;
}

const cardTitle = (result: CsvImportFile) =>
  result.widget?.title ??
  (isFileLevelError(result) ? (result.source ?? result.file) : result.file);

// Under a card's title: the uploaded file it came from, when there are
// several. Before Step 14 the API sent no `source`, so `file` stands in.
function sourceCaption(result: CsvImportFile, isMultiFile: boolean) {
  if (!result.widget || !isMultiFile) return undefined;
  return result.source ?? result.file;
}

function ErrorLines({
  result,
  settingsHref,
}: {
  result: CsvImportFile;
  settingsHref: string;
}) {
  return (
    <ul className="space-y-1 text-sm">
      {result.errors.map((error) => (
        <li
          className="text-destructive"
          key={`${error.line}-${error.column ?? ""}-${error.message}`}
        >
          Line {error.line}
          {error.column ? ` · ${error.column}` : ""}: {error.message}
          {isUnknownAudienceError(error.message) && (
            <>
              {" "}
              <Link className="text-primary underline" href={settingsHref}>
                Add audiences in report settings
              </Link>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function RowNotes({
  result,
  settingsHref,
  isExpanded,
}: {
  result: CsvImportFile;
  settingsHref: string;
  isExpanded: boolean;
}) {
  const hidden = hiddenScopeNote(result);
  return (
    <>
      {hidden && (
        <p className="text-warning flex items-start gap-1.5 text-xs">
          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {hidden}
        </p>
      )}
      {isExpanded && result.errors.length > 0 && (
        <ErrorLines result={result} settingsHref={settingsHref} />
      )}
    </>
  );
}

function RowActions({
  result,
  isExpanded,
  onPreview,
  onToggle,
}: {
  result: CsvImportFile;
  isExpanded: boolean;
  onPreview: () => void;
  onToggle: () => void;
}) {
  const title = cardTitle(result);
  if (result.status === "ready" && result.content && result.widget)
    return (
      <Button
        aria-label={`Preview ${title} on the canvas`}
        onClick={onPreview}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Eye aria-hidden className="size-4" /> Preview
      </Button>
    );
  if (result.errors.length > 0)
    return (
      <Button
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Hide" : "Show"} ${plural(result.errors.length, "error")} in ${title}`}
        onClick={onToggle}
        size="sm"
        type="button"
        variant="ghost"
      >
        {isExpanded ? (
          <ChevronDown aria-hidden className="size-4" />
        ) : (
          <ChevronRight aria-hidden className="size-4" />
        )}
        {plural(result.errors.length, "error")}
      </Button>
    );
  return null;
}

// The review: one row per card the API matched or refused (a combined file
// gives several), with its line errors and visibility notes, and a row per
// file with a problem of its own at the top. A table from md up, stacked
// cards below.
function ReviewList({
  isMultiFile,
  rows,
  settingsHref,
  onPreview,
}: {
  isMultiFile: boolean;
  rows: readonly CsvImportFile[];
  settingsHref: string;
  onPreview: (result: CsvImportFile) => void;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // A file-level error has nothing else to show, so its lines stay open.
  const isExpanded = (result: CsvImportFile) =>
    isFileLevelError(result) || expanded.has(csvResultKey(result));
  const actions = (result: CsvImportFile) =>
    isFileLevelError(result) ? null : (
      <RowActions
        isExpanded={isExpanded(result)}
        onPreview={() => onPreview(result)}
        onToggle={() => toggle(csvResultKey(result))}
        result={result}
      />
    );
  const notes = (result: CsvImportFile) => (
    <RowNotes
      isExpanded={isExpanded(result)}
      result={result}
      settingsHref={settingsHref}
    />
  );
  const caption = (result: CsvImportFile) => {
    const source = sourceCaption(result, isMultiFile);
    return (
      source && (
        <p className="text-muted-foreground text-xs break-all">{source}</p>
      )
    );
  };
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Cards checked</caption>
          <thead className="bg-muted text-muted-foreground border-b text-xs font-medium">
            <tr>
              <th className="px-3 py-2" scope="col">
                Card
              </th>
              <th className="px-3 py-2" scope="col">
                Tab
              </th>
              <th className="px-3 py-2 text-right" scope="col">
                Rows
              </th>
              <th className="px-3 py-2" scope="col">
                Status
              </th>
              <th className="px-3 py-2" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((result) => (
              <tr
                className={
                  isFileLevelError(result)
                    ? "bg-destructive-soft align-top"
                    : "align-top"
                }
                key={csvResultKey(result)}
              >
                <td className="space-y-1 px-3 py-2">
                  <p className="text-strong font-medium break-all">
                    {cardTitle(result)}
                  </p>
                  {caption(result)}
                  {notes(result)}
                </td>
                <td className="px-3 py-2">{result.tab?.title ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {result.rows ?? "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <StatusBadge status={result.status} />
                </td>
                <td className="px-3 py-1 text-right whitespace-nowrap">
                  {actions(result)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label="Cards checked" className="grid gap-2 md:hidden">
        {rows.map((result) => (
          <li
            className={
              isFileLevelError(result)
                ? "border-destructive bg-destructive-soft space-y-1.5 rounded-lg border p-3"
                : "space-y-1.5 rounded-lg border p-3"
            }
            key={csvResultKey(result)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-strong min-w-0 font-medium break-all">
                {cardTitle(result)}
              </p>
              <StatusBadge status={result.status} />
            </div>
            {caption(result)}
            <p className="text-muted-foreground text-xs">
              {result.tab?.title ?? "—"}
              {result.rows !== undefined && ` · ${plural(result.rows, "row")}`}
            </p>
            {notes(result)}
            {actions(result)}
          </li>
        ))}
      </ul>
    </>
  );
}

function Dropzone({
  isSingleCard,
  onAdd,
}: {
  isSingleCard: boolean;
  onAdd: (files: File[]) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsOver(false);
    onAdd([...event.dataTransfer.files]);
  }
  return (
    <div
      className={
        isOver
          ? "border-primary bg-primary-soft rounded-lg border-2 border-dashed p-6 text-center"
          : "border-border-strong bg-muted/50 rounded-lg border-2 border-dashed p-6 text-center"
      }
      data-testid="csv-dropzone"
      onDragLeave={() => setIsOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDrop={onDrop}
    >
      <UploadCloud aria-hidden className="text-primary mx-auto size-8" />
      <p className="text-strong mt-2 font-medium">
        {isSingleCard
          ? "Drop the CSV here or choose it"
          : "Drop the CSV here or choose files"}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {isSingleCard
          ? "The card's CSV or the whole section file. Up to 4 MB."
          : "One file for the whole section, or separate card files or a zip. Up to 4 MB in total."}
      </p>
      <label className="text-primary focus-within:ring-ring mt-4 inline-flex min-h-10 cursor-pointer items-center rounded-sm border border-current px-4 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-offset-2">
        {isSingleCard ? "Choose file" : "Choose files"}
        <input
          accept={
            isSingleCard
              ? ".csv,text/csv"
              : ".csv,.zip,text/csv,application/zip"
          }
          aria-label={
            isSingleCard ? "Choose a CSV file" : "Choose CSV or zip files"
          }
          className="sr-only"
          multiple={!isSingleCard}
          onChange={(event) => {
            onAdd([...(event.target.files ?? [])]);
            // The same file can be chosen again after it is removed.
            event.target.value = "";
          }}
          type="file"
        />
      </label>
    </div>
  );
}

export type CsvImportPreview = {
  itemId: number;
  content: Record<string, unknown>;
  title: string;
};

// Fills Marketing Intelligence and Media Mix Model cards from CSV files: the
// admin chooses files, the API checks them (writing nothing), then Apply
// posts them again with the same "As of" date and the codes of the ready
// cards, so cards with errors are left alone. `item` is the section, tab or
// card the files are checked against.
export function CsvImportDialog({
  item,
  onApplied,
  onClose,
  onPreview,
  report,
  scope,
  scopeLabel,
}: {
  item: LayoutItem;
  onApplied?: () => void;
  onClose: () => void;
  // Shows a ready card's content on the canvas, unsaved; undefined clears it.
  onPreview: (preview: CsvImportPreview | undefined) => void;
  // For the report settings link on an unknown-audience error.
  report: Pick<Report, "id" | "agency_id" | "client_id">;
  scope: ReportScope;
  scopeLabel: string;
}) {
  const isSingleCard = item.level === "widget";
  const checkMutation = useCsvImportPreview(scope);
  const applyMutation = useCsvImportApply(scope);
  const [chosen, setChosen] = useState<File[]>([]);
  const [asOf, setAsOf] = useState(todayIsoDate);
  const [result, setResult] = useState<CsvImportResult>();
  const [error, setError] = useState<string>();
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  // The card shown on the canvas while the dialog steps aside.
  const [previewing, setPreviewing] = useState<CsvImportPreview>();

  const problem = chosen.length
    ? csvImportProblem(chosen, { isSingleCard })
    : null;
  const readyCards = result ? readyCardCodes(result.files) : [];
  const rows = result ? csvReviewRows(item, result.files) : [];
  const unusedCount = rows.filter(
    (row) =>
      row.status !== "ready" &&
      row.status !== "invalid" &&
      row.status !== "skipped",
  ).length;
  const settingsHref = reportSettingsUrl(
    report.id,
    report.agency_id,
    report.client_id,
  );
  const isBusy = checkMutation.isPending || applyMutation.isPending;

  function addFiles(added: File[]) {
    if (added.length === 0) return;
    setError(undefined);
    setResult(undefined);
    if (isSingleCard) {
      setChosen(added.slice(0, 1));
      return;
    }
    setChosen((current) => {
      const keys = new Set(current.map(chosenFileKey));
      return [
        ...current,
        ...added.filter((file) => !keys.has(chosenFileKey(file))),
      ];
    });
  }

  function removeFile(key: string) {
    setError(undefined);
    setResult(undefined);
    setChosen((current) =>
      current.filter((file) => chosenFileKey(file) !== key),
    );
  }

  async function check() {
    setError(undefined);
    try {
      setResult(
        await checkMutation.mutateAsync({
          itemId: item.id,
          files: chosen,
          asOf,
        }),
      );
    } catch (caught) {
      if (isAccessError(caught)) setIsAccessDenied(true);
      else
        setError(
          uploadError(
            caught,
            "The files could not be checked. Please try again.",
          ),
        );
    }
  }

  // A 422 on `cards` means a file changed since the check; its message
  // shows on the review, where the admin can change the files and check
  // again.
  async function apply() {
    if (readyCards.length === 0) return;
    setError(undefined);
    try {
      const applied = await applyMutation.mutateAsync({
        itemId: item.id,
        files: chosen,
        asOf,
        cards: readyCards,
      });
      const count = applied.applied.length;
      toast({
        title:
          count === 0 ? "No cards changed" : `${plural(count, "card")} updated`,
        description:
          count === 0 ? "The files match the saved content." : undefined,
        tone: "success",
      });
      onPreview(undefined);
      onApplied?.();
      onClose();
    } catch (caught) {
      if (isAccessError(caught)) setIsAccessDenied(true);
      else
        setError(
          uploadError(
            caught,
            "The cards could not be updated. Please try again.",
          ),
        );
    }
  }

  function close() {
    onPreview(undefined);
    onClose();
  }

  // Ignored while the dialog steps aside for a preview; its native close
  // event arrives then too.
  function requestClose() {
    if (previewing || isBusy) return;
    if (chosen.length > 0) setIsConfirmingDiscard(true);
    else close();
  }

  function showPreview(row: CsvImportFile) {
    if (!row.widget || !row.content) return;
    const next = {
      itemId: row.widget.id,
      content: row.content,
      title: row.widget.title,
    };
    setPreviewing(next);
    onPreview(next);
  }

  function backToImport() {
    setPreviewing(undefined);
    onPreview(undefined);
  }

  const applyLabel = `Apply ${plural(readyCards.length, "card")}`;
  const footer = isAccessDenied ? (
    <Button onClick={close} type="button" variant="outline">
      Close
    </Button>
  ) : result ? (
    <>
      <Button
        disabled={isBusy}
        onClick={() => {
          setResult(undefined);
          setError(undefined);
        }}
        type="button"
        variant="outline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Change files
      </Button>
      <Button
        disabled={isBusy || readyCards.length === 0}
        onClick={apply}
        type="button"
      >
        {applyMutation.isPending && (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        )}
        {applyMutation.isPending ? "Applying..." : applyLabel}
      </Button>
    </>
  ) : (
    <>
      <Button
        disabled={isBusy}
        onClick={requestClose}
        type="button"
        variant="outline"
      >
        Cancel
      </Button>
      <Button
        disabled={isBusy || chosen.length === 0 || Boolean(problem)}
        onClick={check}
        type="button"
      >
        {checkMutation.isPending && (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        )}
        {checkMutation.isPending ? "Checking..." : "Check files"}
      </Button>
    </>
  );

  return (
    <>
      <Dialog
        description={scopeLabel}
        footer={footer}
        isOpen={!previewing && !isConfirmingDiscard}
        onClose={requestClose}
        size="wide"
        title="Import CSV"
      >
        {isAccessDenied ? (
          <StatePanel
            description="You do not have access to this report."
            kind="permission"
            title="Report unavailable"
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">
                Fill one row per item under each card&apos;s header. Numbers
                without % or $.
              </p>
              <CsvTemplateDownload
                formats={isSingleCard ? ["csv"] : csvTemplateFormats}
                templateHref={(isSample, format) =>
                  reportPaths.csvTemplate(
                    scope.agencyId,
                    scope.clientId,
                    scope.reportId,
                    item.id,
                    { sample: isSample, format },
                  )
                }
              />
            </div>
            {result ? (
              <>
                <p className="text-strong text-sm font-medium" role="status">
                  {[
                    `${formatNumber(result.summary.ready)} ready`,
                    `${formatNumber(result.summary.invalid)} with errors`,
                    `${formatNumber(result.summary.skipped)} skipped`,
                    ...(unusedCount
                      ? [`${formatNumber(unusedCount)} not used`]
                      : []),
                  ].join(" · ")}
                </p>
                {rows.length > 0 ? (
                  <ReviewList
                    isMultiFile={chosen.length > 1}
                    onPreview={showPreview}
                    rows={rows}
                    settingsHref={settingsHref}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    None of the files has data for a card here.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Each ready card gets the CSV content, dated {asOf || "today"},
                  and is shown. Cards with errors and cards missing from the
                  files keep their content. Nothing is saved until you apply.
                </p>
              </>
            ) : (
              <>
                <div className="max-w-56">
                  <FormField
                    description="Shown as “As of …” on each imported card."
                    id="csv-import-as-of"
                    label="As of"
                  >
                    <Input
                      id="csv-import-as-of"
                      onChange={(event) => setAsOf(event.target.value)}
                      type="date"
                      value={asOf}
                    />
                  </FormField>
                </div>
                <Dropzone isSingleCard={isSingleCard} onAdd={addFiles} />
                {chosen.length > 0 && (
                  <ul
                    aria-label="Chosen files"
                    className="divide-y rounded-lg border"
                  >
                    {chosen.map((file) => (
                      <li
                        className="flex items-center gap-2 px-3 py-1.5 text-sm"
                        key={chosenFileKey(file)}
                      >
                        <FileSpreadsheet
                          aria-hidden
                          className="text-muted-foreground size-4 shrink-0"
                        />
                        <span className="text-strong min-w-0 flex-1 break-all">
                          {file.name}
                        </span>
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatFileSize(file.size)}
                        </span>
                        <Button
                          aria-label={`Remove ${file.name}`}
                          className="size-8"
                          disabled={isBusy}
                          onClick={() => removeFile(chosenFileKey(file))}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <X aria-hidden className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {problem && (
                  <p className="text-destructive text-sm" role="alert">
                    {problem}
                  </p>
                )}
              </>
            )}
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Dialog>
      {previewing && (
        <div
          className="bg-card fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-lg border p-3 shadow-[var(--shadow-overlay)]"
          role="status"
        >
          <p className="text-sm">
            <span className="text-strong font-medium">Preview:</span>{" "}
            {previewing.title} with the CSV content. Not saved yet.
          </p>
          <Button autoFocus onClick={backToImport} size="sm" type="button">
            <ArrowLeft aria-hidden className="size-4" /> Back to import
          </Button>
        </div>
      )}
      <ConfirmationDialog
        body={
          <p>
            {plural(chosen.length, "file")} {chosen.length === 1 ? "is" : "are"}{" "}
            chosen but not applied. Nothing has been saved.
          </p>
        }
        cancelLabel="Keep importing"
        confirmLabel="Discard files"
        description="The cards keep their current content."
        isOpen={isConfirmingDiscard}
        onCancel={() => setIsConfirmingDiscard(false)}
        onConfirm={close}
        title="Discard these files?"
      />
    </>
  );
}
