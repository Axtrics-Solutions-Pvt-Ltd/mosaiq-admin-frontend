"use client";

import { Eye, ListTree, PencilRuler, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { toast } from "@/components/ui/Toast";
import { clientDetailUrl, reportLinksUrl, routes } from "@/config/routes";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { budgetsCardId } from "@/features/budgets/BudgetsCard";
import {
  type AppliedCorrectionsContext,
  AppliedCorrectionsDialog,
} from "@/features/corrections/AppliedCorrectionsDialog";
import { isBaseMetric, metricLabel } from "@/features/corrections/contracts";
import {
  type CorrectionContext,
  CorrectionDialog,
} from "@/features/corrections/CorrectionDialog";
import { correctionFilterParams } from "@/features/corrections/filters";
import { metricFormat } from "@/features/corrections/format";
import { ApiError } from "@/lib/api/errors";
import { formatDateRange } from "@/lib/formatters";
import { useMediaQuery } from "@/lib/utils/useMediaQuery";

import type { ReportScope } from "./api";
import {
  type EditingValue,
  type LayoutItem,
  type PreviewWidget,
  type ReorderItem,
  type Report,
  reportMetricLabel,
} from "./contracts";
import { defaultTabCode, findLayoutItem, findTab, moveInOrder } from "./layout";
import { type DateRange, PreviewRangeControls } from "./PreviewRangeControls";
import {
  usePreviewMeta,
  usePreviewTab,
  useReorderLayout,
  useReport,
  useReportLayout,
  useUpdateLayoutItem,
} from "./queries";
import { ReportCanvas } from "./ReportCanvas";
import { ReportPageHeader } from "./ReportPageHeader";
import { StructurePanel } from "./StructurePanel";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";
import { ValueCorrection } from "./ValueCorrection";
import { WidgetInspector } from "./WidgetInspector";

// Opens the Links tab. The count comes from the report, so it is 0 while the
// report is archived (its links don't open then).
function ShareButton({ report }: { report: Report }) {
  const count = report.active_links_count;
  return (
    <Button asChild variant="outline">
      <Link
        href={reportLinksUrl(report.id, report.agency_id, report.client_id)}
      >
        <Share2 aria-hidden className="size-4" /> Share
        <span className="bg-muted text-muted-foreground rounded-sm px-1.5 text-xs tabular-nums">
          {count}
          <span className="sr-only">
            {" "}
            active {count === 1 ? "link" : "links"}
          </span>
        </span>
      </Link>
    </Button>
  );
}

export type BuilderView = {
  tab?: string;
  from?: string;
  to?: string;
  channel?: string;
};

function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}
function isForbidden(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

function correctionsHistoryUrl(report: Report, value: EditingValue) {
  const params = new URLSearchParams({
    [correctionFilterParams.metric]: value.metric,
  });
  if (value.workspace_id)
    params.set(correctionFilterParams.workspace, String(value.workspace_id));
  return `${clientDetailUrl(report.client_id, report.agency_id)}&${params}`;
}

function Builder({
  report,
  scope,
  view,
}: {
  report: Report;
  scope: ReportScope;
  view: BuilderView;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const layout = useReportLayout(scope);
  const meta = usePreviewMeta(scope);
  const reorder = useReorderLayout(scope);
  const updateItem = useUpdateLayoutItem(scope);
  const isLarge = useMediaQuery("(min-width: 64rem)");
  const isWide = useMediaQuery("(min-width: 80rem)");
  const [isPortalView, setIsPortalView] = useState(false);
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number>();
  const [isInspectorDirty, setIsInspectorDirty] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    itemId: number | undefined;
  }>();
  const [correction, setCorrection] = useState<CorrectionContext | null>(null);
  const [appliedCorrections, setAppliedCorrections] =
    useState<AppliedCorrectionsContext | null>(null);
  useUnsavedChangesWarning(isInspectorDirty);

  const sections = layout.data?.sections ?? [];
  const tabCode =
    view.tab && findTab(sections, view.tab)
      ? view.tab
      : defaultTabCode(sections);
  const range: DateRange | undefined =
    view.from && view.to
      ? { from: view.from, to: view.to }
      : meta.data
        ? {
            from: meta.data.date_range.default.from,
            to: meta.data.date_range.default.to,
          }
        : undefined;
  const preview = usePreviewTab(scope, tabCode, {
    from: view.from,
    to: view.to,
    channel: view.channel,
  });
  const selectedItem =
    selectedItemId !== undefined
      ? findLayoutItem(sections, selectedItemId)
      : undefined;
  const tabValues = (preview.data?.widgets ?? []).flatMap(
    (widget) => widget.editing.values,
  );

  function replaceView(
    next: Partial<Record<keyof BuilderView, string | undefined>>,
  ) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  function requestSelect(itemId: number | undefined) {
    if (itemId === selectedItemId) return;
    if (isInspectorDirty) setPendingSelection({ itemId });
    else setSelectedItemId(itemId);
  }

  function saveOrder(order: ReorderItem[] | undefined) {
    if (!order) return;
    reorder.mutate(order, {
      onError: (error) =>
        toast({
          title: "Layout not saved",
          description:
            error instanceof ApiError && error.status === 422
              ? (Object.values(error.fieldErrors)[0] ?? error.message)
              : "The change was undone. Please try again.",
          tone: "error",
        }),
    });
  }

  function toggleWidget(item: LayoutItem, isEnabled: boolean) {
    updateItem.mutate(
      { itemId: item.id, patch: { is_enabled: isEnabled } },
      {
        onError: () =>
          toast({
            title: "Widget not changed",
            description: "The change was undone. Please try again.",
            tone: "error",
          }),
      },
    );
  }

  function openCorrection(value: EditingValue) {
    if (value.workspace_id === undefined || !isBaseMetric(value.metric)) return;
    const workspace = report.workspaces.find(
      (source) => source.id === value.workspace_id,
    );
    setCorrection({
      agencyId: scope.agencyId,
      clientId: scope.clientId,
      clientName: report.client?.name ?? meta.data?.report.client_name ?? "",
      workspaceId: value.workspace_id,
      workspaceName: workspace?.name ?? `Workspace #${value.workspace_id}`,
      channelName: workspace?.channel?.name ?? "this channel",
      metricCode: value.metric,
      metricLabel: metricLabel(value.metric),
      from: value.date_from,
      to: value.date_to,
      currentTotal: value.total ?? 0,
      format: metricFormat(
        value.metric,
        workspace?.currency ?? report.currency,
      ),
    });
  }

  function showCorrections(value: EditingValue) {
    setAppliedCorrections({
      agencyId: scope.agencyId,
      clientId: scope.clientId,
      valueLabel: reportMetricLabel(value.metric),
      from: value.date_from,
      to: value.date_to,
      // A calculated value's corrections are on its inputs, so only a base
      // value narrows the search by metric.
      lookup: {
        ids: value.correction_ids,
        workspace_id: value.workspace_id,
        metric_code: isBaseMetric(value.metric) ? value.metric : undefined,
      },
      historyHref: correctionsHistoryUrl(report, value),
    });
  }

  const period = preview.data?.period;

  function valueAdornment(widget: PreviewWidget) {
    if (widget.editing.values.length === 0) return undefined;
    const byPath = new Map(
      widget.editing.values.map((value) => [value.path, value]),
    );
    return function renderValueCorrection(path: string) {
      const value = byPath.get(path);
      return value ? (
        <ValueCorrection
          // Chart points cover part of the period; their dates tell apart
          // controls that would otherwise share a name.
          dateLabel={
            period &&
            (value.date_from !== period.from || value.date_to !== period.to)
              ? formatDateRange(value.date_from, value.date_to)
              : undefined
          }
          onCorrect={openCorrection}
          onShowCorrections={showCorrections}
          tabValues={tabValues}
          value={value}
        />
      ) : null;
    };
  }

  const previewError =
    preview.isError && !preview.data ? (
      <StatePanel
        action={
          preview.error instanceof ApiError && preview.error.status === 422 ? (
            <Button
              onClick={() => replaceView({ from: undefined, to: undefined })}
            >
              Use the default range
            </Button>
          ) : (
            <Button onClick={() => preview.refetch()}>Try again</Button>
          )
        }
        description={
          preview.error instanceof ApiError && preview.error.status === 422
            ? "This date range can't be shown for this report."
            : "The preview of this tab could not be loaded."
        }
        kind="error"
        title="Preview unavailable"
      />
    ) : null;

  const structure = (
    <StructurePanel
      onReorder={saveOrder}
      onSelectTab={(code) => {
        replaceView({ tab: code });
        setIsStructureOpen(false);
      }}
      sections={sections}
      selectedTabCode={tabCode}
    />
  );
  const inspector = selectedItem ? (
    <WidgetInspector
      item={selectedItem}
      onDirtyChange={setIsInspectorDirty}
      scope={scope}
    />
  ) : null;

  if (layout.isPending) return <p aria-busy="true">Loading report layout...</p>;
  if (layout.isError)
    return (
      <StatePanel
        action={<Button onClick={() => layout.refetch()}>Try again</Button>}
        description="The report layout could not be loaded."
        kind="error"
        title="Builder unavailable"
      />
    );

  return (
    <PageStack>
      <ReportPageHeader
        actions={
          <>
            <ShareButton report={report} />
            <Button
              aria-pressed={isPortalView}
              onClick={() => {
                setIsPortalView((current) => !current);
                setIsStructureOpen(false);
              }}
              variant={isPortalView ? "default" : "outline"}
            >
              {isPortalView ? (
                <>
                  <PencilRuler aria-hidden className="size-4" /> Back to design
                </>
              ) : (
                <>
                  <Eye aria-hidden className="size-4" /> Preview as portal
                </>
              )}
            </Button>
          </>
        }
        current="design"
        description="Choose what the client portal shows, in which order, and write its text. This preview uses the same data as the portal."
        report={report}
      />
      <Card className="flex flex-wrap items-end justify-between gap-3 p-4">
        {meta.data && range ? (
          <PreviewRangeControls
            channel={view.channel}
            key={`${range.from}-${range.to}`}
            meta={meta.data}
            onChannelChange={(channel) => replaceView({ channel })}
            onRangeChange={(next) =>
              replaceView({ from: next.from, to: next.to })
            }
            range={range}
          />
        ) : meta.isError ? (
          <p className="text-destructive text-sm" role="alert">
            The date range settings could not be loaded.
          </p>
        ) : (
          <p aria-busy="true" className="text-muted-foreground text-sm">
            Loading date range...
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {preview.data && (
            <p className="text-muted-foreground text-xs">
              {formatDateRange(
                preview.data.period.from,
                preview.data.period.to,
              )}{" "}
              compared with{" "}
              {formatDateRange(
                preview.data.period.compare_from,
                preview.data.period.compare_to,
              )}
            </p>
          )}
          {!isLarge && !isPortalView && (
            <Button
              onClick={() => setIsStructureOpen(true)}
              size="sm"
              variant="outline"
            >
              <ListTree aria-hidden className="size-4" /> Structure
            </Button>
          )}
        </div>
      </Card>
      {isPortalView && (
        <p className="bg-primary-soft text-primary rounded-lg border border-blue-200 p-3 text-sm">
          Portal preview: hidden sections, tabs and widgets are left out and
          editing controls are off.
        </p>
      )}
      <div
        className={
          isPortalView
            ? "grid gap-4"
            : "grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_20rem]"
        }
      >
        {!isPortalView && isLarge && (
          <aside className="bg-card self-start rounded-lg border p-3">
            {structure}
          </aside>
        )}
        <div className="min-w-0">
          <ReportCanvas
            budgetsUrl={`${clientDetailUrl(report.client_id, report.agency_id)}#${budgetsCardId}`}
            currency={meta.data?.currency ?? report.currency}
            isPortalView={isPortalView}
            onChannelSelect={(channel) => replaceView({ channel })}
            onEditWidget={(itemId) => requestSelect(itemId)}
            onMoveWidget={(tab, itemId, offset) =>
              saveOrder(moveInOrder(tab.children, itemId, offset))
            }
            onSelectTab={(code) => replaceView({ tab: code })}
            onToggleWidget={toggleWidget}
            preview={{
              widgets: preview.data?.widgets,
              isPending: preview.isPending,
              isFetching: preview.isFetching,
              error: previewError,
            }}
            sections={sections}
            selectedItemId={isPortalView ? undefined : selectedItemId}
            selectedTabCode={tabCode}
            valueAdornment={valueAdornment}
          />
        </div>
        {!isPortalView && isWide && (
          <aside className="bg-card self-start rounded-lg border p-4">
            {inspector ?? (
              <div className="space-y-2 text-sm">
                <h2 className="text-strong font-semibold">Inspector</h2>
                <p className="text-muted-foreground">
                  Choose the pencil on a widget to edit its title, settings or
                  text.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
      <Drawer
        isOpen={!isPortalView && !isLarge && isStructureOpen}
        onClose={() => setIsStructureOpen(false)}
        side="left"
        title="Report structure"
      >
        {structure}
      </Drawer>
      <Drawer
        isOpen={!isPortalView && !isWide && Boolean(inspector)}
        onClose={() => requestSelect(undefined)}
        size="wide"
        title="Edit widget"
      >
        {!isWide && inspector}
      </Drawer>
      <ConfirmationDialog
        body={<p>The widget you are editing has unsaved changes.</p>}
        confirmLabel="Discard changes"
        description="Your edits will be lost."
        isOpen={Boolean(pendingSelection)}
        onCancel={() => setPendingSelection(undefined)}
        onConfirm={() => {
          setIsInspectorDirty(false);
          setSelectedItemId(pendingSelection?.itemId);
          setPendingSelection(undefined);
        }}
        title="Discard widget changes?"
      />
      <CorrectionDialog
        context={correction}
        onClose={() => setCorrection(null)}
      />
      <AppliedCorrectionsDialog
        context={appliedCorrections}
        onClose={() => setAppliedCorrections(null)}
        workspaces={report.workspaces}
      />
    </PageStack>
  );
}

export function ReportBuilder({
  agencyId,
  clientId,
  reportId,
  view,
}: {
  agencyId: number;
  clientId: number;
  reportId: number;
  view: BuilderView;
}) {
  const scope = { agencyId, clientId, reportId };
  const user = useCurrentUser();
  const report = useReport(scope);
  const hasScope = [agencyId, clientId, reportId].every(
    (id) => Number.isSafeInteger(id) && id > 0,
  );
  if (!hasScope)
    return (
      <StatePanel
        action={
          <Button asChild>
            <Link href={routes.reports.index}>Open reports</Link>
          </Button>
        }
        description="Open this report from the reports list."
        kind="error"
        title="Report scope required"
      />
    );
  if (user.isPending || report.isPending)
    return <p aria-busy="true">Loading report...</p>;
  if (
    !(user.data && hasCapability(user.data, "reports.manage")) ||
    isForbidden(report.error)
  )
    return (
      <StatePanel
        description="You do not have access to this report."
        kind="permission"
        title="Report unavailable"
      />
    );
  if (report.isError)
    return (
      <StatePanel
        action={
          isNotFound(report.error) ? (
            <Button asChild>
              <Link href={routes.reports.index}>Open reports</Link>
            </Button>
          ) : (
            <Button onClick={() => report.refetch()}>Try again</Button>
          )
        }
        description={
          isNotFound(report.error)
            ? "This report doesn't exist or was deleted."
            : "The report could not be loaded."
        }
        kind="error"
        title={
          isNotFound(report.error) ? "Report not found" : "Report unavailable"
        }
      />
    );
  return <Builder report={report.data} scope={scope} view={view} />;
}
