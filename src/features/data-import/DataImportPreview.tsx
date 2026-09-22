"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  Paperclip,
  RotateCcw,
  SquareArrowOutUpRight,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { type DragEvent, useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaginatedCombobox } from "@/components/shared/PaginatedCombobox";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/config/routes";
import { useAgencies, useAgency } from "@/features/agencies/queries";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import type {
  ClientRecord,
  WorkspaceRecord,
} from "@/features/workspaces/contracts";
import {
  useInfiniteClients,
  useInfiniteWorkspaces,
} from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils/cn";
import { useScope } from "@/providers/ScopeProvider";

import { csvTemplateDownloadUrl } from "./api";
import {
  type CreativeAssetRecord,
  type CsvImportMode,
  csvImportModes,
  type CsvImportType,
  csvImportTypes,
  csvTemplateColumns,
  datasetTypeLabels,
  maxCreativeAssetFileSizeBytes,
  maxCsvImportFileSizeBytes,
} from "./contracts";
import {
  dataImportKeys,
  useAttachCreativeAssetFile,
  useConfirmCsvImport,
  useCreativeAssets,
  useCsvImport,
  useCsvTemplates,
  usePreviewCsvImport,
  useRetryCsvImport,
} from "./queries";

function uniqueById<Option extends { id: number }>(options: Option[]) {
  return [...new Map(options.map((option) => [option.id, option])).values()];
}

function formatFileSize(bytes: number) {
  return bytes < 1024 ? "< 1 KB" : `${Math.round(bytes / 1024)} KB`;
}

const knownStatuses = new Set([
  "previewed",
  "invalid",
  "processing",
  "imported",
  "failed",
]);

function ImportStatusBadge({ status }: { status: string }) {
  if (knownStatuses.has(status))
    return (
      <StatusBadge
        status={
          status as
            "previewed" | "invalid" | "processing" | "imported" | "failed"
        }
      />
    );
  return <Badge>{status}</Badge>;
}

function ValidationErrorEntry({ error }: { error: unknown }) {
  if (error && typeof error === "object" && !Array.isArray(error)) {
    return (
      <div className="grid gap-1 rounded-sm border p-3 text-sm sm:grid-cols-2">
        {Object.entries(error as Record<string, unknown>).map(
          ([key, value]) => (
            <p key={key}>
              <span className="text-muted-foreground">{key}: </span>
              {String(value)}
            </p>
          ),
        )}
      </div>
    );
  }
  return (
    <div className="rounded-sm border p-3 text-sm">
      <span className="text-muted-foreground">{String(error)}</span>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

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
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const scope = useScope();
  const canImport = Boolean(
    currentUser.data && hasCapability(currentUser.data, "imports.create"),
  );
  const canViewHistory = Boolean(
    currentUser.data && hasCapability(currentUser.data, "importHistory.view"),
  );

  const agencyId = scope.agencyId;

  const [pageAgencyId, setPageAgencyId] = useState<number>();
  const effectiveAgencyId = agencyId ?? pageAgencyId;
  const agenciesQuery = useAgencies({ page: 1, per_page: 100 });
  const agencies = agenciesQuery.data?.data ?? [];
  const lockedAgencyQuery = useAgency(agencyId ?? 0);

  const [clientSearch, setClientSearch] = useState("");
  const [client, setClient] = useState<ClientRecord>();
  const clientsQuery = useInfiniteClients(effectiveAgencyId ?? 0, clientSearch);
  const clientOptions = uniqueById(
    clientsQuery.data?.pages.flatMap((page) => page.data) ?? [],
  );

  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceRecord>();
  const workspacesQuery = useInfiniteWorkspaces(
    client?.agency_id ?? effectiveAgencyId ?? 0,
    client?.id ?? 0,
    workspaceSearch,
  );
  const workspaceOptions = uniqueById(
    workspacesQuery.data?.pages.flatMap((page) => page.data) ?? [],
  );

  const resolvedAgencyId =
    workspace?.agency_id ?? client?.agency_id ?? effectiveAgencyId;

  const [datasetType, setDatasetType] = useState<CsvImportType>("reporting");
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [csvImportId, setCsvImportId] = useState<number>();
  const [mode, setMode] = useState<CsvImportMode>("append");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [priorHeaderAgencyId, setPriorHeaderAgencyId] = useState(agencyId);
  if (priorHeaderAgencyId !== agencyId) {
    setPriorHeaderAgencyId(agencyId);
    setPageAgencyId(undefined);
  }

  const [priorAgencyId, setPriorAgencyId] = useState(effectiveAgencyId);
  if (priorAgencyId !== effectiveAgencyId) {
    setPriorAgencyId(effectiveAgencyId);
    setClient(undefined);
    setWorkspace(undefined);
    setCsvImportId(undefined);
  }

  const previewMutation = usePreviewCsvImport();
  const confirmMutation = useConfirmCsvImport();
  const retryMutation = useRetryCsvImport();
  const importQuery = useCsvImport(
    resolvedAgencyId ?? 0,
    client?.id ?? 0,
    workspace?.id ?? 0,
    csvImportId,
  );
  const csvImport = importQuery.data;

  const templatesQuery = useCsvTemplates();
  const template = templatesQuery.data?.find(
    (entry) => entry.type === datasetType,
  );
  const templateColumns = template ? csvTemplateColumns(template) : [];
  const [templateVersion, setTemplateVersion] = useState<number>();
  const activeTemplateVersion = templateVersion ?? template?.version;

  const [creativeFiles, setCreativeFiles] = useState<Record<number, File>>({});
  const [creativeFileErrors, setCreativeFileErrors] = useState<
    Record<number, string>
  >({});
  const [pendingCreativeRowId, setPendingCreativeRowId] = useState<number>();
  const attachCreativeAssetMutation = useAttachCreativeAssetFile();
  const creativeAssetsQuery = useCreativeAssets(
    resolvedAgencyId ?? 0,
    client?.id ?? 0,
    workspace?.id ?? 0,
    datasetType === "creative_assets" ? csvImportId : undefined,
  );

  function selectCreativeFile(rowId: number, selected: File | undefined) {
    setCreativeFileErrors((prev) => ({ ...prev, [rowId]: "" }));
    if (!selected) return;
    if (selected.size > maxCreativeAssetFileSizeBytes) {
      setCreativeFileErrors((prev) => ({
        ...prev,
        [rowId]: "This file exceeds the 10,240 KB upload limit.",
      }));
      return;
    }
    setCreativeFiles((prev) => ({ ...prev, [rowId]: selected }));
  }

  async function attachCreativeFile(row: CreativeAssetRecord) {
    const selected = creativeFiles[row.id];
    if (
      !resolvedAgencyId ||
      !client ||
      !workspace ||
      !csvImportId ||
      !selected
    )
      return;
    setPendingCreativeRowId(row.id);
    setCreativeFileErrors((prev) => ({ ...prev, [row.id]: "" }));
    try {
      await attachCreativeAssetMutation.mutateAsync({
        agencyId: resolvedAgencyId,
        clientId: client.id,
        workspaceId: workspace.id,
        creativeAssetId: row.id,
        csvImportId,
        file: selected,
      });
      setCreativeFiles((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (error) {
      setCreativeFileErrors((prev) => ({
        ...prev,
        [row.id]:
          error instanceof ApiError
            ? error.message
            : "The file could not be attached. Please try again.",
      }));
    } finally {
      setPendingCreativeRowId(undefined);
    }
  }

  function selectClient(next: ClientRecord) {
    setClient(next);
    setWorkspace(undefined);
    setCsvImportId(undefined);
  }

  function selectWorkspace(next: WorkspaceRecord) {
    setWorkspace(next);
    setCsvImportId(undefined);
  }

  function rememberFile(selected: File | undefined) {
    setFileError(undefined);
    setSubmitError(undefined);
    if (!selected) {
      setFile(undefined);
      return;
    }
    if (selected.size > maxCsvImportFileSizeBytes) {
      setFile(undefined);
      setFileError("This file exceeds the 2,048 KB upload limit.");
      return;
    }
    setFile(selected);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    rememberFile(event.dataTransfer.files[0]);
  }

  async function submitPreview() {
    if (!resolvedAgencyId || !client || !workspace || !file) return;
    setSubmitError(undefined);
    try {
      const record = await previewMutation.mutateAsync({
        agencyId: resolvedAgencyId,
        clientId: client.id,
        workspaceId: workspace.id,
        type: datasetType,
        file,
      });
      queryClient.setQueryData(
        dataImportKeys.detail(
          resolvedAgencyId,
          client.id,
          workspace.id,
          record.id,
        ),
        record,
      );
      setCsvImportId(record.id);
      setMode(record.mode ?? "append");
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "The file could not be validated. Please try again.",
      );
    }
  }

  async function confirmImport() {
    if (!resolvedAgencyId || !client || !workspace || !csvImportId) return;
    try {
      await confirmMutation.mutateAsync({
        agencyId: resolvedAgencyId,
        clientId: client.id,
        workspaceId: workspace.id,
        csvImportId,
        payload: { mode },
      });
    } finally {
      setIsConfirmOpen(false);
    }
  }

  function retryImport() {
    if (!resolvedAgencyId || !client || !workspace || !csvImportId) return;
    void retryMutation.mutateAsync({
      agencyId: resolvedAgencyId,
      clientId: client.id,
      workspaceId: workspace.id,
      csvImportId,
    });
  }

  function resetFlow() {
    setFile(undefined);
    setFileError(undefined);
    setSubmitError(undefined);
    setCsvImportId(undefined);
    setCreativeFiles({});
    setCreativeFileErrors({});
    previewMutation.reset();
    confirmMutation.reset();
    retryMutation.reset();
    attachCreativeAssetMutation.reset();
  }

  const isValidating =
    previewMutation.isPending ||
    (Boolean(csvImportId) && importQuery.isPending) ||
    csvImport?.status === "processing";
  const canConfirm = csvImport?.status === "previewed";
  const canRetry = csvImport?.status === "failed";
  const isConfirmed = csvImport?.status === "imported";

  if (currentUser.isPending) return <LoadingCard />;

  if (currentUser.isError)
    return (
      <StatePanel
        action={
          <Button onClick={() => currentUser.refetch()}>Try again</Button>
        }
        description="Your access could not be confirmed. Please try again."
        kind="error"
        title="Data import unavailable"
      />
    );

  if (currentUser.isSuccess && !canImport)
    return (
      <StatePanel
        action={
          canViewHistory ? (
            <Button asChild variant="outline">
              <Link href={routes.importHistory}>View import history</Link>
            </Button>
          ) : undefined
        }
        description="Importing CSV data is limited to Super Admin and Agency Admin roles. Contact an administrator for your agency."
        kind="permission"
        title="You do not have access to data import"
      />
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <PageHeader
        actions={
          canViewHistory ? (
            <Button asChild variant="outline">
              <Link href={routes.importHistory}>Import history</Link>
            </Button>
          ) : undefined
        }
        context="Data operations"
        description="Upload a CSV file, review validation results, and confirm append or replace for Reporting, Marketing Intelligence, or Media Mix Model data."
        title="Data import"
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="space-y-6 pt-5">
              <section aria-labelledby="scope-heading">
                <div id="scope-heading">
                  <SectionHeading
                    description="Select the client, workspace, and dataset for this import."
                    number="1"
                    title="Choose destination"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="import-agency">Agency</Label>
                    {agencyId ? (
                      <p className="bg-muted text-muted-foreground mt-1.5 flex min-h-10 items-center rounded-sm border px-3 text-sm">
                        {lockedAgencyQuery.data?.display_name ??
                          `Agency #${agencyId}`}
                      </p>
                    ) : (
                      <Select
                        className="mt-1.5"
                        id="import-agency"
                        onChange={(event) => {
                          setPageAgencyId(
                            event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          );
                        }}
                        value={pageAgencyId ?? ""}
                      >
                        <option value="">All agencies</option>
                        {agencies.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.display_name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="import-client">Client</Label>
                    <div className="mt-1.5">
                      <PaginatedCombobox
                        errorMessage={
                          clientsQuery.isError
                            ? "Clients could not be loaded."
                            : undefined
                        }
                        getKey={(option) => String(option.id)}
                        getLabel={(option) => `#${option.id} ${option.name}`}
                        hasNextPage={clientsQuery.hasNextPage}
                        id="import-client"
                        isFetchingNextPage={clientsQuery.isFetchingNextPage}
                        isLoading={clientsQuery.isPending}
                        loadNextPage={() => void clientsQuery.fetchNextPage()}
                        mode="single"
                        onChange={selectClient}
                        onRetry={() => void clientsQuery.refetch()}
                        onSearchChange={setClientSearch}
                        options={clientOptions}
                        placeholder="Select a client"
                        renderOption={(option) => (
                          <span className="truncate">
                            <span className="font-mono text-xs">
                              #{option.id}
                            </span>{" "}
                            {option.name}
                          </span>
                        )}
                        searchPlaceholder="Search client name"
                        value={client}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="import-workspace">Workspace</Label>
                    <div className="mt-1.5">
                      <PaginatedCombobox
                        disabled={!client}
                        errorMessage={
                          workspacesQuery.isError
                            ? "Workspaces could not be loaded."
                            : undefined
                        }
                        getKey={(option) => String(option.id)}
                        getLabel={(option) => option.name}
                        hasNextPage={workspacesQuery.hasNextPage}
                        id="import-workspace"
                        isFetchingNextPage={workspacesQuery.isFetchingNextPage}
                        isLoading={workspacesQuery.isPending && Boolean(client)}
                        loadNextPage={() =>
                          void workspacesQuery.fetchNextPage()
                        }
                        mode="single"
                        onChange={selectWorkspace}
                        onRetry={() => void workspacesQuery.refetch()}
                        onSearchChange={setWorkspaceSearch}
                        options={workspaceOptions}
                        placeholder={
                          client
                            ? "Select a workspace"
                            : "Select a client first"
                        }
                        renderOption={(option) => (
                          <span className="truncate">
                            <span className="font-mono text-xs">
                              #{option.id}
                            </span>{" "}
                            {option.name}
                          </span>
                        )}
                        searchPlaceholder="Search workspace name"
                        value={workspace}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="import-dataset">Dataset type</Label>
                    <Select
                      className="mt-1.5"
                      id="import-dataset"
                      onChange={(event) => {
                        setDatasetType(event.target.value as CsvImportType);
                        setCsvImportId(undefined);
                        setTemplateVersion(undefined);
                      }}
                      value={datasetType}
                    >
                      {csvImportTypes.map((type) => (
                        <option key={type} value={type}>
                          {datasetTypeLabels[type]}
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
                    description="Confirm the exact header this workspace's backend expects before uploading."
                    number="2"
                    title="Check the template"
                  />
                </div>
                {templatesQuery.isPending ? (
                  <Skeleton className="h-16 w-full" />
                ) : templatesQuery.isError ? (
                  <StatePanel
                    action={
                      <Button onClick={() => templatesQuery.refetch()}>
                        Try again
                      </Button>
                    }
                    description="The current template list could not be loaded."
                    kind="error"
                    title="Templates unavailable"
                  />
                ) : template ? (
                  <>
                    <p className="text-muted-foreground mb-3 text-sm">
                      Expected columns for {datasetTypeLabels[datasetType]}
                      (version {template.version}):
                    </p>
                    <ul
                      aria-label="Expected columns"
                      className="flex flex-wrap gap-2"
                    >
                      {templateColumns.map((column) => (
                        <li key={column}>
                          <Badge>{column}</Badge>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      {template.accepted_versions.length > 1 && (
                        <div>
                          <Label htmlFor="template-version">
                            Sample version
                          </Label>
                          <Select
                            className="mt-1.5"
                            id="template-version"
                            onChange={(event) =>
                              setTemplateVersion(Number(event.target.value))
                            }
                            value={activeTemplateVersion}
                          >
                            {template.accepted_versions.map((version) => (
                              <option key={version} value={version}>
                                Version {version}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                      {resolvedAgencyId && client && workspace ? (
                        <Button asChild size="sm" type="button" variant="outline">
                          <a
                            download
                            href={csvTemplateDownloadUrl(
                              resolvedAgencyId,
                              client.id,
                              workspace.id,
                              datasetType,
                              activeTemplateVersion ?? template.version,
                            )}
                          >
                            <Download aria-hidden className="size-4" /> Download
                            sample CSV ({datasetTypeLabels[datasetType]})
                          </a>
                        </Button>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          Choose a client and workspace to download a sample
                          CSV.
                        </p>
                      )}
                      {templateColumns.includes("date") && (
                        <span className="text-muted-foreground text-xs">
                          Dates use the YYYY-MM-DD format, e.g. 2026-01-15.
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No template is registered for this dataset type yet.
                  </p>
                )}
              </section>

              <section aria-labelledby="file-heading" className="border-t pt-6">
                <div id="file-heading">
                  <SectionHeading
                    description="Files are validated by the server. Maximum size is 2,048 KB."
                    number="3"
                    title="Select a CSV"
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
                    CSV files up to 2,048 KB
                  </p>
                  <label className="text-primary focus-within:ring-ring mt-4 inline-flex min-h-10 cursor-pointer items-center rounded-sm border border-current px-4 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-offset-2">
                    Choose local file
                    <input
                      accept=".csv,text/csv"
                      aria-label="Choose local CSV file"
                      className="sr-only"
                      onChange={(event) =>
                        rememberFile(event.target.files?.[0])
                      }
                      type="file"
                    />
                  </label>
                </div>
                {fileError && (
                  <p className="text-destructive mt-3 text-sm" role="alert">
                    {fileError}
                  </p>
                )}
                {file && !fileError && (
                  <p className="text-strong mt-3 flex items-center gap-2 text-sm">
                    <FileSpreadsheet aria-hidden className="size-4" /> Selected:{" "}
                    <strong className="break-all">{file.name}</strong> (
                    {formatFileSize(file.size)})
                  </p>
                )}
                {submitError && (
                  <p className="text-destructive mt-3 text-sm" role="alert">
                    {submitError}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    disabled={
                      !resolvedAgencyId ||
                      !client ||
                      !workspace ||
                      !file ||
                      previewMutation.isPending
                    }
                    onClick={submitPreview}
                  >
                    {previewMutation.isPending && (
                      <LoaderCircle
                        aria-hidden
                        className="size-4 animate-spin"
                      />
                    )}
                    {previewMutation.isPending
                      ? "Uploading..."
                      : "Upload and validate"}{" "}
                    {!previewMutation.isPending && (
                      <ArrowRight aria-hidden className="size-4" />
                    )}
                  </Button>
                  {(!client || !workspace) && (
                    <span className="text-muted-foreground text-xs">
                      Choose a client and workspace to continue.
                    </span>
                  )}
                </div>
              </section>
            </CardContent>
          </Card>

          {csvImportId && (
            <Card>
              <CardContent className="space-y-6 pt-5">
                <section aria-labelledby="validation-heading">
                  <div id="validation-heading">
                    <SectionHeading
                      description="Server-side validation results for the uploaded file."
                      number="4"
                      title="Review validation"
                    />
                  </div>
                  {isValidating && !csvImport ? (
                    <div
                      aria-busy="true"
                      aria-label="Validating file"
                      className="space-y-3"
                    >
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : importQuery.isError ? (
                    <StatePanel
                      action={
                        <Button onClick={() => importQuery.refetch()}>
                          Try again
                        </Button>
                      }
                      description="This import's status could not be loaded."
                      kind="error"
                      title="Status unavailable"
                    />
                  ) : csvImport ? (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-strong font-medium break-all">
                          {csvImport.original_filename}
                        </p>
                        <ImportStatusBadge status={csvImport.status} />
                      </div>
                      {csvImport.status === "processing" && (
                        <p
                          className="text-info mt-3 flex items-center gap-2 text-sm"
                          role="status"
                        >
                          <LoaderCircle
                            aria-hidden
                            className="size-4 animate-spin"
                          />
                          Validating on the server. This updates automatically.
                        </p>
                      )}
                      <dl className="mt-4 grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-muted-foreground">Total rows</dt>
                          <dd className="text-strong mt-1 font-medium">
                            {formatNumber(csvImport.row_count)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Valid rows</dt>
                          <dd className="text-success mt-1 font-medium">
                            {formatNumber(csvImport.valid_count)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Error rows</dt>
                          <dd className="text-destructive mt-1 font-medium">
                            {formatNumber(csvImport.error_count)}
                          </dd>
                        </div>
                      </dl>
                      {csvImport.failure_code && (
                        <p className="bg-destructive-soft text-destructive mt-3 rounded-sm border p-3 text-sm">
                          <strong>Failure code:</strong>{" "}
                          {csvImport.failure_code}
                        </p>
                      )}
                      {csvImport.file_expires_at && (
                        <p className="text-muted-foreground mt-3 text-xs">
                          The uploaded file expires{" "}
                          {formatDate(csvImport.file_expires_at)}. Confirm or
                          retry before then.
                        </p>
                      )}
                      {csvImport.validation_errors.length > 0 && (
                        <div className="mt-5 border-t pt-5">
                          <h3 className="text-strong font-semibold">
                            Row issues
                          </h3>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Showing {csvImport.validation_errors.length}{" "}
                            reported issues.
                          </p>
                          <div className="mt-3 space-y-2">
                            {csvImport.validation_errors.map((error, index) => (
                              <ValidationErrorEntry error={error} key={index} />
                            ))}
                          </div>
                        </div>
                      )}
                      {canRetry && (
                        <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-5">
                          <Button
                            disabled={retryMutation.isPending}
                            onClick={retryImport}
                            variant="outline"
                          >
                            {retryMutation.isPending && (
                              <LoaderCircle
                                aria-hidden
                                className="size-4 animate-spin"
                              />
                            )}
                            {retryMutation.isPending
                              ? "Retrying..."
                              : "Retry import"}
                          </Button>
                          {retryMutation.isError && (
                            <span
                              className="text-destructive text-sm"
                              role="alert"
                            >
                              {retryMutation.error instanceof ApiError
                                ? retryMutation.error.message
                                : "Retry failed. Please try again."}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : null}
                </section>

                {canConfirm && (
                  <section
                    aria-labelledby="confirm-heading"
                    className="border-t pt-5"
                  >
                    <div id="confirm-heading">
                      <SectionHeading
                        description="Choose how the validated rows should be applied."
                        number="5"
                        title="Confirm import"
                      />
                    </div>
                    <fieldset>
                      <legend className="text-strong text-sm font-medium">
                        Import mode
                      </legend>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {csvImportModes.map((value) => (
                          <label
                            className={cn(
                              "flex cursor-pointer gap-3 rounded-lg border p-4",
                              mode === value &&
                                "border-primary bg-primary-soft",
                            )}
                            key={value}
                          >
                            <input
                              checked={mode === value}
                              name="import-mode"
                              onChange={() => setMode(value)}
                              type="radio"
                              value={value}
                            />
                            <span>
                              <span className="text-strong block font-medium">
                                {value === "append"
                                  ? "Append rows"
                                  : "Replace dataset"}
                              </span>
                              <span className="text-muted-foreground mt-1 block text-sm">
                                {value === "append"
                                  ? "Add these rows to the current dataset."
                                  : "Deactivate prior versions of this dataset; their records are retained."}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {mode === "replace" && (
                      <p className="bg-warning-soft text-warning mt-3 rounded-sm border p-3 text-sm">
                        <strong>Replacement consequence:</strong> the current{" "}
                        {datasetTypeLabels[datasetType]} dataset for{" "}
                        {workspace?.name} would be deactivated. Its prior
                        records are retained, not deleted.
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button onClick={() => setIsConfirmOpen(true)}>
                        Confirm import{" "}
                        <ArrowRight aria-hidden className="size-4" />
                      </Button>
                      {confirmMutation.isError && (
                        <span className="text-destructive text-sm" role="alert">
                          {confirmMutation.error instanceof ApiError
                            ? confirmMutation.error.message
                            : "Confirmation failed. Please try again."}
                        </span>
                      )}
                    </div>
                  </section>
                )}

                {isConfirmed && (
                  <section className="border-t pt-5 text-center">
                    <CheckCircle2
                      aria-hidden
                      className="text-success mx-auto size-10"
                    />
                    <h2 className="text-strong mt-3 text-xl font-semibold">
                      Import confirmed
                    </h2>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
                      {csvImport?.mode === "replace" ? "Replace" : "Append"}{" "}
                      import for {datasetTypeLabels[datasetType]} in{" "}
                      {workspace?.name}{" "}
                      {csvImport?.completed_at
                        ? `completed ${formatDate(csvImport.completed_at)}.`
                        : "is finishing on the server."}
                    </p>
                    {datasetType !== "creative_assets" && (
                      <div className="mt-5 flex justify-center">
                        <Button onClick={resetFlow} variant="outline">
                          <RotateCcw aria-hidden className="size-4" /> Start
                          another import
                        </Button>
                      </div>
                    )}
                  </section>
                )}

                {isConfirmed && datasetType === "creative_assets" && (
                  <section
                    aria-labelledby="creative-attach-heading"
                    className="border-t pt-5 text-left"
                  >
                    <div id="creative-attach-heading">
                      <SectionHeading
                        description="Each imported row needs a media file attached. This is a separate step from the CSV import above."
                        number="6"
                        title="Attach creative files"
                      />
                    </div>
                    {creativeAssetsQuery.isPending ? (
                      <div
                        aria-busy="true"
                        aria-label="Loading imported rows"
                        className="space-y-3"
                      >
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </div>
                    ) : creativeAssetsQuery.isError ? (
                      <StatePanel
                        action={
                          <Button onClick={() => creativeAssetsQuery.refetch()}>
                            Try again
                          </Button>
                        }
                        description="The imported creative rows could not be loaded."
                        kind="error"
                        title="Rows unavailable"
                      />
                    ) : creativeAssetsQuery.data &&
                      creativeAssetsQuery.data.length > 0 ? (
                      <ul className="space-y-3">
                        {creativeAssetsQuery.data.map((row) => {
                          const isPending = pendingCreativeRowId === row.id;
                          const rowError = creativeFileErrors[row.id];
                          const selected = creativeFiles[row.id];
                          return (
                            <li className="rounded-lg border p-4" key={row.id}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-strong truncate font-medium">
                                    {row.title}
                                  </p>
                                  <p className="text-muted-foreground text-sm">
                                    {row.campaign_name} · {row.channel}
                                  </p>
                                </div>
                                {row.asset_url ? (
                                  <a
                                    className="text-primary inline-flex items-center gap-1.5 text-sm font-medium"
                                    href={row.asset_url}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    <CheckCircle2
                                      aria-hidden
                                      className="size-4"
                                    />
                                    Attached
                                    <SquareArrowOutUpRight
                                      aria-hidden
                                      className="size-3.5"
                                    />
                                  </a>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="text-primary focus-within:ring-ring inline-flex min-h-9 cursor-pointer items-center rounded-sm border border-current px-3 py-1.5 text-sm font-medium focus-within:ring-2 focus-within:ring-offset-2">
                                      {selected ? selected.name : "Choose file"}
                                      <input
                                        accept="image/*,video/*"
                                        aria-label={`Choose media file for ${row.title}`}
                                        className="sr-only"
                                        onChange={(event) =>
                                          selectCreativeFile(
                                            row.id,
                                            event.target.files?.[0],
                                          )
                                        }
                                        type="file"
                                      />
                                    </label>
                                    <Button
                                      disabled={!selected || isPending}
                                      onClick={() => attachCreativeFile(row)}
                                      size="sm"
                                      type="button"
                                    >
                                      {isPending && (
                                        <LoaderCircle
                                          aria-hidden
                                          className="size-4 animate-spin"
                                        />
                                      )}
                                      <Paperclip
                                        aria-hidden
                                        className="size-4"
                                      />
                                      {isPending ? "Attaching..." : "Attach"}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {rowError && (
                                <p
                                  className="text-destructive mt-2 text-sm"
                                  role="alert"
                                >
                                  {rowError}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <StatePanel
                        description="No creative asset rows were found for this import."
                        kind="empty"
                        title="No rows to attach"
                      />
                    )}
                    <div className="mt-5 flex justify-center">
                      <Button onClick={resetFlow} variant="outline">
                        <RotateCcw aria-hidden className="size-4" /> Start
                        another import
                      </Button>
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <aside
          aria-label="Import summary"
          className="space-y-4 xl:sticky xl:top-20"
        >
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Destination</p>
                <p className="text-strong font-medium">
                  {client && workspace
                    ? `${client.name} / ${workspace.name}`
                    : "Not selected"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Dataset</p>
                <p className="text-strong font-medium">
                  {datasetTypeLabels[datasetType]}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Selected file</p>
                <p className="text-strong font-medium break-all">
                  {file?.name ?? "None"}
                </p>
              </div>
              {csvImport && (
                <div>
                  <p className="text-muted-foreground">Import status</p>
                  <div className="mt-1">
                    <ImportStatusBadge status={csvImport.status} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="bg-info-soft text-info flex gap-3 rounded-lg border border-current/20 p-4 text-sm">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              Confirming an import changes live workspace data. Review row
              counts and errors carefully before choosing append or replace.
            </p>
          </div>
        </aside>
      </div>

      <ConfirmationDialog
        body={
          <p className="text-sm">
            {mode === "replace"
              ? `Replacing will deactivate the current ${datasetTypeLabels[datasetType]} dataset for ${workspace?.name ?? "this workspace"}. Its prior records are retained.`
              : `Appending will add ${csvImport ? formatNumber(csvImport.valid_count) : ""} valid rows to the current ${datasetTypeLabels[datasetType]} dataset for ${workspace?.name ?? "this workspace"}.`}
          </p>
        }
        confirmLabel={
          confirmMutation.isPending ? "Confirming..." : "Confirm import"
        }
        description={
          mode === "replace"
            ? "This deactivates the current dataset and cannot be undone from this screen."
            : "This adds rows to the current dataset and cannot be undone from this screen."
        }
        isOpen={isConfirmOpen}
        isPending={confirmMutation.isPending}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={confirmImport}
        title="Confirm this import?"
      />
    </div>
  );
}
