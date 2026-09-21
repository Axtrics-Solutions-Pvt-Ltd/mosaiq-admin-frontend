"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { type DragEvent, useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";

import {
  datasetGuides,
  type DatasetType,
  importAgencies,
  mmmReadiness,
  type PreviewScenario,
  scenarioReviews,
} from "./view-model";

type Step = "prepare" | "review" | "complete";
type ImportMode = "append" | "replace";

const scenarioKeys: PreviewScenario[] = [
  "valid",
  "mixed",
  "invalid",
  "processing",
  "failed",
  "unavailable",
];
const steps: { id: Step; label: string }[] = [
  { id: "prepare", label: "Prepare file" },
  { id: "review", label: "Review validation" },
  { id: "complete", label: "Completion preview" },
];

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex gap-3">
      <span className="bg-primary-soft text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {number}
      </span>
      <div>
        <h2 className="text-strong font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
      </div>
    </div>
  );
}

export function DataImportPreview() {
  const [agencyId, setAgencyId] = useState<string>(importAgencies[0].id);
  const [workspaceId, setWorkspaceId] = useState<string>(
    importAgencies[0].workspaces[0].id,
  );
  const [datasetType, setDatasetType] = useState<DatasetType>("reporting");
  const [scenario, setScenario] = useState<PreviewScenario>("valid");
  const [step, setStep] = useState<Step>("prepare");
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
  } | null>(null);
  const [mode, setMode] = useState<ImportMode>("append");
  const [makeActive, setMakeActive] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const agency =
    importAgencies.find((entry) => entry.id === agencyId) ?? importAgencies[0];
  const workspace =
    agency.workspaces.find((entry) => entry.id === workspaceId) ??
    agency.workspaces[0];
  const guide = datasetGuides[datasetType];
  const review = scenarioReviews[scenario];
  const hasReview = step !== "prepare";
  const canConfirm = review.status === "ready" && review.errorCount === 0;

  function rememberFile(file: File | undefined) {
    if (!file) return;
    setSelectedFile({
      name: file.name,
      size: file.size < 1024 ? "< 1 KB" : Math.round(file.size / 1024) + " KB",
    });
    setStep("prepare");
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    rememberFile(event.dataTransfer.files[0]);
  }
  function resetFlow() {
    setStep("prepare");
    setSelectedFile(null);
    setMode("append");
    setMakeActive(true);
    setScenario("valid");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <PageHeader
        context="Data operations"
        description="Walk through a sample CSV import for Reporting, Marketing Intelligence, or Media Mix Model data."
        isPreview
        title="Data import"
      />
      <div className="border-info/20 bg-info-soft text-info flex gap-3 rounded-lg border p-4 text-sm">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>UI preview:</strong> File selection displays a filename only.
          Validation, processing, completion, and activation below use designed
          sample data. Nothing is uploaded or saved.
        </p>
      </div>

      <nav
        aria-label="Import progress"
        className="bg-card rounded-lg border p-4"
      >
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((entry, index) => (
            <li
              key={entry.id}
              aria-current={step === entry.id ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm",
                step === entry.id
                  ? "bg-primary-soft text-primary font-semibold"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
                  step === entry.id && "border-primary",
                )}
              >
                {index + 1}
              </span>
              {entry.label}
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="space-y-6 pt-5">
              <section aria-labelledby="scope-heading">
                <div id="scope-heading">
                  <SectionHeading
                    number="1"
                    title="Choose destination"
                    description="Select the agency, workspace, and dataset for this example."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="import-agency">Agency</Label>
                    <Select
                      id="import-agency"
                      className="mt-1.5"
                      value={agencyId}
                      onChange={(event) => {
                        const next =
                          importAgencies.find(
                            (entry) => entry.id === event.target.value,
                          ) ?? importAgencies[0];
                        setAgencyId(next.id);
                        setWorkspaceId(next.workspaces[0].id);
                        setStep("prepare");
                      }}
                    >
                      {importAgencies.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="import-workspace">Workspace</Label>
                    <Select
                      id="import-workspace"
                      className="mt-1.5"
                      value={workspaceId}
                      onChange={(event) => {
                        setWorkspaceId(event.target.value);
                        setStep("prepare");
                      }}
                    >
                      {agency.workspaces.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="import-dataset">Dataset type</Label>
                    <Select
                      id="import-dataset"
                      className="mt-1.5"
                      value={datasetType}
                      onChange={(event) => {
                        setDatasetType(event.target.value as DatasetType);
                        setStep("prepare");
                      }}
                    >
                      {Object.entries(datasetGuides).map(([key, entry]) => (
                        <option key={key} value={key}>
                          {entry.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </section>
              <section
                aria-labelledby="template-heading"
                className="border-t pt-6"
              >
                <div id="template-heading">
                  <SectionHeading
                    number="2"
                    title="Check the template"
                    description={guide.description}
                  />
                </div>
                <p className="text-muted-foreground mb-3 text-sm">
                  Expected columns for {guide.label}:
                </p>
                <ul
                  className="flex flex-wrap gap-2"
                  aria-label="Expected columns"
                >
                  {guide.columns.map((column) => (
                    <li key={column}>
                      <Badge>{column}</Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button disabled variant="outline">
                    <Download aria-hidden className="size-4" /> Download sample
                    CSV
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    Unavailable in UI preview; no template file is provided.
                  </span>
                </div>
              </section>
              <section aria-labelledby="file-heading" className="border-t pt-6">
                <div id="file-heading">
                  <SectionHeading
                    number="3"
                    title="Select a CSV"
                    description="The selected filename is shown locally. The file is not read or sent."
                  />
                </div>
                <div
                  className="border-border-strong bg-muted/50 rounded-lg border-2 border-dashed p-6 text-center"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onDrop}
                >
                  <UploadCloud
                    aria-hidden
                    className="text-primary mx-auto size-8"
                  />
                  <p className="text-strong mt-2 font-medium">
                    Drop a file here or choose one
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    CSV selection preview only
                  </p>
                  <label className="text-primary focus-within:ring-ring mt-4 inline-flex min-h-10 cursor-pointer items-center rounded-sm border border-current px-4 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-offset-2">
                    Choose local file
                    <input
                      className="sr-only"
                      type="file"
                      accept=".csv,text/csv"
                      aria-label="Choose local CSV file"
                      onChange={(event) =>
                        rememberFile(event.target.files?.[0])
                      }
                    />
                  </label>
                </div>
                {selectedFile && (
                  <p className="text-strong mt-3 flex items-center gap-2 text-sm">
                    <FileSpreadsheet aria-hidden className="size-4" /> Selected
                    locally:{" "}
                    <strong className="break-all">{selectedFile.name}</strong> (
                    {selectedFile.size})
                  </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button onClick={() => setStep("review")}>
                    Show sample validation{" "}
                    <ArrowRight aria-hidden className="size-4" />
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    You can inspect examples without selecting a file.
                  </span>
                </div>
              </section>
            </CardContent>
          </Card>

          {hasReview && (
            <Card>
              <CardContent className="space-y-6 pt-5">
                <section aria-labelledby="validation-heading">
                  <div id="validation-heading">
                    <SectionHeading
                      number="4"
                      title="Review sample validation"
                      description="Switch between example states to inspect the screen design."
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="w-full sm:max-w-xs">
                      <Label htmlFor="import-scenario">
                        Validation example
                      </Label>
                      <Select
                        className="mt-1.5"
                        id="import-scenario"
                        value={scenario}
                        onChange={(event) => {
                          setScenario(event.target.value as PreviewScenario);
                          setStep("review");
                        }}
                      >
                        {scenarioKeys.map((key) => (
                          <option key={key} value={key}>
                            {scenarioReviews[key].label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Badge
                      tone={
                        review.status === "ready"
                          ? "success"
                          : review.status === "blocked" ||
                              review.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {review.label} · sample state
                    </Badge>
                  </div>
                  <div
                    className={cn(
                      "mt-4 rounded-lg border p-4 text-sm",
                      review.status === "blocked" || review.status === "failed"
                        ? "bg-destructive-soft text-destructive"
                        : review.warningCount > 0
                          ? "bg-warning-soft text-warning"
                          : "bg-info-soft text-info",
                    )}
                  >
                    <p className="font-medium">
                      {review.status === "blocked"
                        ? "Import blocked"
                        : review.status === "failed"
                          ? "Example processing failure"
                          : review.status === "processing"
                            ? "Example processing in progress"
                            : review.status === "unavailable"
                              ? "Processing unavailable"
                              : review.errorCount > 0
                                ? "Errors require correction"
                                : review.warningCount > 0
                                  ? "Review warnings"
                                  : "Example file is ready"}
                    </p>
                    <p className="mt-1">{review.note}</p>
                  </div>
                  <dl className="mt-4 grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">
                        Example filename
                      </dt>
                      <dd className="text-strong mt-1 font-medium break-all">
                        {review.fileName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Example size</dt>
                      <dd className="text-strong mt-1 font-medium">
                        {review.fileSize}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Dataset</dt>
                      <dd className="text-strong mt-1 font-medium">
                        {guide.label}
                      </dd>
                    </div>
                  </dl>
                  {selectedFile && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Your selected file, {selectedFile.name}, was not used to
                      produce this example.
                    </p>
                  )}
                  {review.status === "processing" ? (
                    <div className="mt-5" role="status">
                      <div className="flex justify-between text-sm">
                        <span>Sample processing stage</span>
                        <span>Stage 2 of 4</span>
                      </div>
                      <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                        <div className="bg-primary h-full w-1/2 rounded-full" />
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Illustrative progress, not a live percentage.
                      </p>
                    </div>
                  ) : review.status === "failed" ||
                    review.status === "unavailable" ? (
                    <p className="text-muted-foreground mt-4 text-sm">
                      Retry and server processing will be added with the
                      functional import API.
                    </p>
                  ) : (
                    <>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="bg-success-soft rounded-lg border p-3">
                          <p className="text-success text-sm">Valid rows</p>
                          <p className="text-strong text-xl font-semibold">
                            {review.validCount}
                          </p>
                        </div>
                        <div className="bg-warning-soft rounded-lg border p-3">
                          <p className="text-warning text-sm">Warning rows</p>
                          <p className="text-strong text-xl font-semibold">
                            {review.warningCount}
                          </p>
                        </div>
                        <div className="bg-destructive-soft rounded-lg border p-3">
                          <p className="text-destructive text-sm">Error rows</p>
                          <p className="text-strong text-xl font-semibold">
                            {review.errorCount}
                          </p>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        {review.rowCount} total example rows. Counts describe
                        the sample scenario.
                      </p>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <h3 className="text-strong text-sm font-semibold">
                            Recognized columns
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {guide.columns
                              .filter(
                                (column) =>
                                  !review.missingColumns.includes(column),
                              )
                              .map((column) => (
                                <Badge key={column} tone="success">
                                  {column}
                                </Badge>
                              ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-strong text-sm font-semibold">
                            Missing columns
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {review.missingColumns.length ? (
                              review.missingColumns.map((column) => (
                                <Badge key={column} tone="danger">
                                  {column}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                None in this example
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </section>
                {review.issues.length > 0 && (
                  <section
                    className="border-t pt-5"
                    aria-labelledby="issues-heading"
                  >
                    <h3
                      className="text-strong font-semibold"
                      id="issues-heading"
                    >
                      Row issues
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Showing {review.issues.length} representative issues from
                      this example.
                    </p>
                    <div className="mt-3 space-y-2">
                      {review.issues.map((issue) => (
                        <div
                          key={issue.row + issue.column}
                          className="grid gap-1 rounded-sm border p-3 text-sm sm:grid-cols-[5rem_7rem_1fr]"
                        >
                          <span className="text-strong font-medium">
                            Row {issue.row}
                          </span>
                          <span className="text-muted-foreground">
                            {issue.column}
                          </span>
                          <span className="flex items-start gap-2">
                            {issue.severity === "error" ? (
                              <AlertCircle
                                aria-hidden
                                className="text-destructive mt-0.5 size-4 shrink-0"
                              />
                            ) : (
                              <Info
                                aria-hidden
                                className="text-warning mt-0.5 size-4 shrink-0"
                              />
                            )}
                            {issue.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {(review.status === "ready" || review.status === "blocked") && (
                  <section
                    className="border-t pt-5"
                    aria-labelledby="sample-rows-heading"
                  >
                    <h3
                      className="text-strong font-semibold"
                      id="sample-rows-heading"
                    >
                      First rows preview
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Illustrative values for {guide.label}; no CSV content was
                      read.
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-lg border">
                      <table className="w-full min-w-max border-collapse text-left text-sm">
                        <thead className="bg-muted">
                          <tr>
                            {guide.columns.map((column) => (
                              <th
                                key={column}
                                className="text-strong px-3 py-2 font-medium"
                                scope="col"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {guide.sampleRows.map((row, index) => (
                            <tr key={row[0] + index} className="border-t">
                              {row.map((value, cellIndex) => (
                                <td
                                  key={guide.columns[cellIndex]}
                                  className="px-3 py-2"
                                >
                                  {value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {datasetType === "mmm" &&
                  (review.status === "ready" ||
                    review.status === "blocked") && (
                    <section
                      className="border-t pt-5"
                      aria-labelledby="mmm-heading"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <h3
                          className="text-strong font-semibold"
                          id="mmm-heading"
                        >
                          MMM readiness example
                        </h3>
                        <Badge tone="primary">
                          {mmmReadiness.score}/100 sample score
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Illustrative assessment only; no readiness calculation
                        ran.
                      </p>
                      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                        {mmmReadiness.checks.map((check) => (
                          <div
                            key={check.label}
                            className="rounded-lg border p-3"
                          >
                            <dt className="text-muted-foreground text-sm">
                              {check.label}
                            </dt>
                            <dd className="text-strong mt-1 font-semibold">
                              {check.value}
                            </dd>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {check.detail}
                            </p>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                <section
                  className="border-t pt-5"
                  aria-labelledby="confirm-heading"
                >
                  <div id="confirm-heading">
                    <SectionHeading
                      number="5"
                      title="Choose confirmation options"
                      description="Inspect the append or replace consequence before the completion preview."
                    />
                  </div>
                  <fieldset>
                    <legend className="text-strong text-sm font-medium">
                      Import mode
                    </legend>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {(["append", "replace"] as const).map((value) => (
                        <label
                          key={value}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-lg border p-4",
                            mode === value && "border-primary bg-primary-soft",
                          )}
                        >
                          <input
                            type="radio"
                            name="import-mode"
                            value={value}
                            checked={mode === value}
                            onChange={() => setMode(value)}
                          />
                          <span>
                            <span className="text-strong block font-medium">
                              {value === "append"
                                ? "Append rows"
                                : "Replace dataset"}
                            </span>
                            <span className="text-muted-foreground mt-1 block text-sm">
                              {value === "append"
                                ? "Add rows to the current dataset."
                                : "Existing dataset rows would be replaced after confirmation."}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {mode === "replace" && (
                    <p className="bg-warning-soft text-warning mt-3 rounded-sm border p-3 text-sm">
                      <strong>Replacement consequence:</strong> the current{" "}
                      {guide.label} dataset for {workspace.name} would be
                      replaced. Review this choice before a real import.
                    </p>
                  )}
                  <label className="mt-4 flex items-start gap-3 text-sm">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={makeActive}
                      onChange={(event) => setMakeActive(event.target.checked)}
                    />
                    <span>
                      <span className="text-strong font-medium">
                        Make this dataset active
                      </span>
                      <span className="text-muted-foreground block">
                        In a real flow, active data would be used for this
                        workspace. This preview changes no active dataset.
                      </span>
                    </span>
                  </label>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      disabled={!canConfirm}
                      onClick={() => setIsConfirmOpen(true)}
                    >
                      Review confirmation{" "}
                      <ArrowRight aria-hidden className="size-4" />
                    </Button>
                    {!canConfirm && (
                      <span className="text-muted-foreground text-sm">
                        This example cannot be confirmed. Select the valid-file
                        example to inspect completion.
                      </span>
                    )}
                  </div>
                </section>
              </CardContent>
            </Card>
          )}
          {step === "complete" && (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2
                  aria-hidden
                  className="text-success mx-auto size-10"
                />
                <h2 className="text-strong mt-3 text-xl font-semibold">
                  Completion preview
                </h2>
                <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
                  This illustrates a completed {mode} import for {guide.label}{" "}
                  in {workspace.name}.{" "}
                  {makeActive
                    ? "The example dataset is shown as active."
                    : "The example dataset is shown as inactive."}{" "}
                  No upload, import, or activation occurred.
                </p>
                <div className="mt-5 flex justify-center">
                  <Button variant="outline" onClick={resetFlow}>
                    <RotateCcw aria-hidden className="size-4" /> Start another
                    preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <aside
          className="space-y-4 xl:sticky xl:top-20"
          aria-label="Import summary"
        >
          <Card>
            <CardHeader>
              <CardTitle>Preview summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Destination</p>
                <p className="text-strong font-medium">
                  {agency.name} / {workspace.name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Dataset</p>
                <p className="text-strong font-medium">{guide.label}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Selected local file</p>
                <p className="text-strong font-medium break-all">
                  {selectedFile?.name ?? "None"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Current example</p>
                <p className="text-strong font-medium">
                  {hasReview ? review.label : "Not selected"}
                </p>
              </div>
            </CardContent>
          </Card>
          {hasReview && (
            <Button variant="ghost" onClick={() => setStep("prepare")}>
              <ArrowLeft aria-hidden className="size-4" /> Back to file
              selection
            </Button>
          )}
        </aside>
      </div>
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          setStep("complete");
        }}
        title="Show completion preview?"
        description={
          mode === "replace"
            ? "Replacing a dataset would remove its current rows in a real import."
            : "Appending would add rows to the current dataset in a real import."
        }
        confirmLabel="Show sample completion"
        body={
          <p className="text-sm">
            This preview will show {mode} for {guide.label} in {workspace.name}.
            The example dataset will be shown as{" "}
            {makeActive ? "active" : "inactive"}. No data will change.
          </p>
        }
      />
    </div>
  );
}
