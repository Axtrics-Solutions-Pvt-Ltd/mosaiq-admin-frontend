"use client";

import { ChevronDown, ChevronUp, LocateFixed, Share2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useRef, useState } from "react";

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
import type { WidgetPart } from "@/features/report-widgets/contracts";
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
import {
  draftPreviewWidget,
  type InspectorDraft,
  withDraftLayout,
} from "./draft-preview";
import type { InspectorFormHandle } from "./inspector-parts";
import {
  defaultTabCode,
  findLayoutItem,
  findTab,
  itemTitle,
  layoutItemElementId,
  tabsOf,
} from "./layout";
import { type DateRange, PreviewRangeControls } from "./PreviewRangeControls";
import {
  usePreviewMeta,
  usePreviewTab,
  usePreviewTabs,
  useReorderLayout,
  useReport,
  useReportLayout,
  useUpdateLayoutItem,
} from "./queries";
import { ReportCanvas } from "./ReportCanvas";
import { ReportPageHeader } from "./ReportPageHeader";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";
import {
  combinedValuesNote,
  isCombinedValue,
  ValueCorrection,
} from "./ValueCorrection";
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

// Scrolls a canvas widget into view, e.g. after stepping to it from the
// inspector, so the widget and its settings stay side by side.
function revealLayoutItem(itemId: number) {
  const isReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  document.getElementById(layoutItemElementId(itemId))?.scrollIntoView({
    behavior: isReducedMotion ? "auto" : "smooth",
    block: "nearest",
  });
}

// Until the inspector reaches its sticky place it starts lower on the page,
// and a viewport-tall panel would run off the bottom, taking its Save bar
// with it. This keeps the panel within the part of the viewport below its
// top edge, so the bar stays on screen at every scroll position.
function fitToViewport(element: HTMLElement | null) {
  if (!element) return;
  let frame = 0;
  const fit = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const top = Math.max(0, element.getBoundingClientRect().top);
      element.style.maxHeight = `min(calc(100dvh - 4rem - 2 * var(--page-padding)), max(20rem, calc(100dvh - ${top}px - var(--page-padding))))`;
    });
  };
  fit();
  window.addEventListener("scroll", fit, { passive: true });
  window.addEventListener("resize", fit);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", fit);
    window.removeEventListener("resize", fit);
  };
}

// Desktop inspector header: where the open widget sits in the tab, stepping
// to its neighbours and closing. The drawer has its own close button.
function InspectorNav({
  item,
  onClose,
  onSelect,
  onShow,
  siblings,
}: {
  item: LayoutItem;
  onClose: () => void;
  onSelect: (itemId: number) => void;
  // Scrolls to the open widget and flashes it.
  onShow: () => void;
  siblings: readonly LayoutItem[];
}) {
  const index = siblings.findIndex((sibling) => sibling.id === item.id);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 ? siblings[index + 1] : undefined;
  return (
    // -top-4 cancels the aside's padding: sticky offsets are measured from
    // the padding edge, so top-0 would leave a gap that content scrolls into.
    // Above the form's sticky Save bar, which scrolls up past it when the
    // budgets below the form are in view.
    <div className="bg-card sticky -top-4 z-20 -mx-4 -mt-4 mb-4 flex items-center gap-1 border-b px-4 py-2">
      <p className="text-muted-foreground mr-auto text-xs font-medium">
        {index >= 0
          ? `Widget ${index + 1} of ${siblings.length}`
          : item.level === "section"
            ? "Editing section"
            : "Editing widget"}
      </p>
      {item.level === "widget" && (
        <Button
          aria-label={`Show ${itemTitle(item)} on the canvas`}
          className="size-8"
          onClick={onShow}
          size="icon"
          title="Show on canvas"
          type="button"
          variant="ghost"
        >
          <LocateFixed aria-hidden className="size-4" />
        </Button>
      )}
      {index >= 0 && (
        <>
          <Button
            aria-label={
              previous
                ? `Edit previous widget: ${itemTitle(previous)}`
                : "No previous widget"
            }
            className="size-8"
            disabled={!previous}
            onClick={() => previous && onSelect(previous.id)}
            size="icon"
            title="Previous widget"
            type="button"
            variant="ghost"
          >
            <ChevronUp aria-hidden className="size-4" />
          </Button>
          <Button
            aria-label={
              next ? `Edit next widget: ${itemTitle(next)}` : "No next widget"
            }
            className="size-8"
            disabled={!next}
            onClick={() => next && onSelect(next.id)}
            size="icon"
            title="Next widget"
            type="button"
            variant="ghost"
          >
            <ChevronDown aria-hidden className="size-4" />
          </Button>
        </>
      )}
      <Button
        aria-label="Close inspector"
        className="size-8"
        onClick={onClose}
        size="icon"
        title="Close"
        type="button"
        variant="ghost"
      >
        <X aria-hidden className="size-4" />
      </Button>
    </div>
  );
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
  const isWide = useMediaQuery("(min-width: 80rem)");
  const [selectedItemId, setSelectedItemId] = useState<number>();
  // Bumped by "Add budgets" so the inspector scrolls to the budgets.
  const [budgetFocusRequest, setBudgetFocusRequest] = useState(0);
  const [isInspectorDirty, setIsInspectorDirty] = useState(false);
  const [isBudgetDirty, setIsBudgetDirty] = useState(false);
  // The open form's unsaved edits. Deferred, so typing stays quick while the
  // canvas redraws.
  const [draft, setDraft] = useState<InspectorDraft>();
  const previewDraft = useDeferredValue(draft);
  const inspectorForm = useRef<InspectorFormHandle>(null);
  const [isSavingToContinue, setIsSavingToContinue] = useState(false);
  // Bumped to flash a widget on the canvas: when it opens in the inspector,
  // or from "Show on canvas".
  const [highlight, setHighlight] = useState<{
    itemId: number;
    count: number;
  }>();
  // A card part clicked on the canvas, whose field the inspector focuses,
  // and the part whose field has focus, outlined on the card.
  const [focusPart, setFocusPart] = useState<{
    itemId: number;
    part: WidgetPart;
    count: number;
  }>();
  const [activePart, setActivePart] = useState<WidgetPart>();
  // Bumped by the inspector's "Edit numbers for" so the widget's values
  // table opens where the pencils are.
  const [valuesReveal, setValuesReveal] = useState<{
    itemId: number;
    count: number;
  }>();
  const [pendingSelection, setPendingSelection] = useState<{
    itemId: number | undefined;
    shouldReveal: boolean;
    // Runs once the selection changes, e.g. the tab switch that closed it.
    then?: () => void;
  }>();
  const [correction, setCorrection] = useState<CorrectionContext | null>(null);
  // A combined value whose channel was just chosen from its menu: its
  // correction opens once the preview for that channel arrives.
  const [pendingCorrection, setPendingCorrection] = useState<{
    itemId: number;
    path: string;
    metric: string;
    channel: string;
  }>();
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
  // The widgets the inspector steps through, in canvas order.
  const tabWidgets = (
    findTab(sections, tabCode ?? "")?.tab.children ?? []
  ).filter((item) => item.level === "widget");
  const tabValues = (preview.data?.widgets ?? []).flatMap(
    (widget) => widget.editing.values,
  );
  // A calculated value's inputs may only be shown on another tab. Those tabs'
  // previews load the first time a lock asks for them, for the same range
  // and channel, so their values carry the totals a correction starts from.
  const [isSearchingOtherTabs, setIsSearchingOtherTabs] = useState(false);
  const otherTabs = sections
    .flatMap((section) => tabsOf(section))
    .filter((tab) => tab.code !== tabCode);
  const otherPreviews = usePreviewTabs(
    scope,
    otherTabs.map((tab) => tab.code),
    { from: view.from, to: view.to, channel: view.channel },
    isSearchingOtherTabs,
  );
  const otherTabValues = otherPreviews.flatMap((query, index) =>
    (query.data?.widgets ?? []).flatMap((widget) =>
      widget.editing.values.map((value) => ({
        value,
        tabName: itemTitle(otherTabs[index]!),
      })),
    ),
  );
  const otherTabsStatus = !isSearchingOtherTabs
    ? "idle"
    : otherPreviews.some((query) => query.isPending)
      ? "loading"
      : otherPreviews.some((query) => query.isError)
        ? "error"
        : "ready";
  if (
    pendingCorrection &&
    view.channel === pendingCorrection.channel &&
    preview.data &&
    !preview.isPlaceholderData
  ) {
    const match = preview.data.widgets
      .find((widget) => widget.editing.item_id === pendingCorrection.itemId)
      ?.editing.values.find(
        (value) =>
          value.path === pendingCorrection.path &&
          value.metric === pendingCorrection.metric,
      );
    setPendingCorrection(undefined);
    // Still combined (a channel with several workspaces): the value's menu
    // explains that, so nothing opens.
    if (match) openCorrection(match);
  }

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

  function highlightItem(itemId: number, shouldReveal: boolean) {
    if (shouldReveal) revealLayoutItem(itemId);
    setHighlight((current) => ({ itemId, count: (current?.count ?? 0) + 1 }));
  }

  // A chart keeps its pencils in a collapsed values table; opening the chart
  // opens the table too, so its glowing values are in view.
  function revealChartValues(itemId: number) {
    const widget = preview.data?.widgets.find(
      (candidate) => candidate.editing.item_id === itemId,
    );
    if (widget?.type !== "line_chart" || widget.editing.values.length === 0)
      return;
    setValuesReveal((current) => ({
      itemId,
      count: (current?.count ?? 0) + 1,
    }));
  }

  function select(itemId: number | undefined, shouldReveal: boolean) {
    setSelectedItemId(itemId);
    // The inspector it was in is gone, and with it the focus.
    setActivePart(undefined);
    if (itemId === undefined) return;
    revealChartValues(itemId);
    highlightItem(itemId, shouldReveal);
  }

  function requestSelect(
    itemId: number | undefined,
    shouldReveal = false,
    then?: () => void,
  ) {
    if (itemId === selectedItemId) {
      if (itemId !== undefined) highlightItem(itemId, shouldReveal);
      return then?.();
    }
    if (isInspectorDirty) {
      setPendingSelection({ itemId, shouldReveal, then });
      return;
    }
    select(itemId, shouldReveal);
    then?.();
  }

  function continuePendingSelection() {
    if (!pendingSelection) return;
    setIsInspectorDirty(false);
    setIsBudgetDirty(false);
    select(pendingSelection.itemId, pendingSelection.shouldReveal);
    pendingSelection.then?.();
    setPendingSelection(undefined);
  }

  async function saveAndContinue() {
    setIsSavingToContinue(true);
    const isSaved = (await inspectorForm.current?.submit()) ?? false;
    setIsSavingToContinue(false);
    // Not saved: the form shows why, so the dialog steps aside.
    if (isSaved) continuePendingSelection();
    else setPendingSelection(undefined);
  }

  // A widget stays open only on its own tab. Leaving the tab closes it, and
  // asks first when it has unsaved edits. A section stays open on any tab.
  function selectTab(code: string) {
    const isKept =
      selectedItem?.level !== "widget" ||
      Boolean(
        findTab(sections, code)?.tab.children.some(
          (child) => child.id === selectedItem.id,
        ),
      );
    if (isKept) replaceView({ tab: code });
    else requestSelect(undefined, false, () => replaceView({ tab: code }));
  }

  function changeChannel(channel: string | undefined) {
    setPendingCorrection(undefined);
    replaceView({ channel });
  }

  function saveOrder(order: ReorderItem[]) {
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
      campaignKey: value.campaign_key ?? undefined,
      campaignName: value.campaign_name ?? undefined,
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

  // Scrolls to the widget that shows a calculated value's input, and opens
  // its values table when the input is listed there.
  function showValue(value: EditingValue) {
    const holder = preview.data?.widgets.find((widget) =>
      widget.editing.values.includes(value),
    );
    if (!holder) return;
    const itemId = holder.editing.item_id;
    if (holder.type === "line_chart")
      setValuesReveal((current) => ({
        itemId,
        count: (current?.count ?? 0) + 1,
      }));
    highlightItem(itemId, true);
  }

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
          // A chart's values table carries one note for combined totals.
          isCombinedExplained={widget.type === "line_chart"}
          dateLabel={
            period &&
            (value.date_from !== period.from || value.date_to !== period.to)
              ? formatDateRange(value.date_from, value.date_to)
              : undefined
          }
          channels={meta.data?.channels}
          onCorrect={openCorrection}
          onPickChannel={(picked, channel) => {
            changeChannel(channel);
            // A calculated value has no correction of its own; narrowing
            // the preview brings back its inputs.
            if (picked.is_base)
              setPendingCorrection({
                itemId: widget.editing.item_id,
                path: picked.path,
                metric: picked.metric,
                channel,
              });
          }}
          onShowCorrections={showCorrections}
          onShowValue={showValue}
          otherTabs={{
            status: otherTabsStatus,
            values: otherTabValues,
            onSearch: () => setIsSearchingOtherTabs(true),
          }}
          tabValues={tabValues}
          value={value}
        />
      ) : null;
    };
  }

  function valuesPanel(widget: PreviewWidget) {
    const itemId = widget.editing.item_id;
    return {
      note: widget.editing.values.some(isCombinedValue)
        ? combinedValuesNote
        : undefined,
      revealRequest:
        valuesReveal?.itemId === itemId ? valuesReveal.count : undefined,
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

  const budgetMonth = (
    preview.data?.period.to ??
    range?.to ??
    new Date().toISOString()
  ).slice(0, 7);
  const inspector = selectedItem ? (
    <WidgetInspector
      accents={layout.data?.accents}
      budgets={{
        allBudgetsHref: `${clientDetailUrl(report.client_id, report.agency_id)}#${budgetsCardId}`,
        focusRequest: budgetFocusRequest,
        initialMonth: budgetMonth,
        workspaces: report.workspaces,
      }}
      item={selectedItem}
      liveEditing={{
        values:
          preview.data?.widgets.find(
            (widget) => widget.editing.item_id === selectedItem.id,
          )?.editing.values ?? [],
        channel: view.channel,
        channels: meta.data?.channels ?? [],
        onChannelChange: changeChannel,
        range: { from: view.from, to: view.to, channel: view.channel },
        onRevealValues: () =>
          setValuesReveal((current) => ({
            itemId: selectedItem.id,
            count: (current?.count ?? 0) + 1,
          })),
        onShowValues: () => {
          revealChartValues(selectedItem.id);
          highlightItem(selectedItem.id, true);
        },
      }}
      focusPart={focusPart?.itemId === selectedItem.id ? focusPart : undefined}
      formRef={inspectorForm}
      onActivePartChange={setActivePart}
      onBudgetsDirtyChange={setIsBudgetDirty}
      onDirtyChange={setIsInspectorDirty}
      onDraftChange={setDraft}
      scope={scope}
    />
  ) : null;
  // The canvas shows the open item as it would be saved.
  const shownDraft =
    selectedItem && previewDraft?.itemId === selectedItem.id
      ? previewDraft
      : undefined;
  const canvasSections = withDraftLayout(
    sections,
    selectedItem,
    shownDraft,
    layout.data?.accents ?? [],
  );
  const canvasWidgets =
    selectedItem && shownDraft
      ? preview.data?.widgets.map((widget) =>
          widget.editing.item_id === shownDraft.itemId
            ? draftPreviewWidget(widget, selectedItem, shownDraft.patch)
            : widget,
        )
      : preview.data?.widgets;
  const pendingTitle = selectedItem ? itemTitle(selectedItem) : "This item";

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
        actions={<ShareButton report={report} />}
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
            onChannelChange={changeChannel}
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
        {preview.data && (
          <p className="text-muted-foreground text-xs">
            {formatDateRange(preview.data.period.from, preview.data.period.to)}{" "}
            compared with{" "}
            {formatDateRange(
              preview.data.period.compare_from,
              preview.data.period.compare_to,
            )}
          </p>
        )}
      </Card>
      {/* Wider on large screens, where forms with several columns of
          fields (tables, rows of values) were cramped. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          <ReportCanvas
            currency={meta.data?.currency ?? report.currency}
            onAddBudgets={(itemId) => {
              setBudgetFocusRequest((request) => request + 1);
              requestSelect(itemId);
            }}
            onChannelSelect={changeChannel}
            onEditSection={(itemId) => requestSelect(itemId)}
            onEditWidget={(itemId) => {
              setBudgetFocusRequest(0);
              requestSelect(itemId);
            }}
            onPickWidget={(itemId, part) => {
              if (part)
                setFocusPart((current) => ({
                  itemId,
                  part,
                  count: (current?.count ?? 0) + 1,
                }));
              // Already open: only its field is focused, without a flash.
              if (itemId === selectedItemId) return;
              setBudgetFocusRequest(0);
              requestSelect(itemId);
            }}
            onReorder={saveOrder}
            onSelectTab={selectTab}
            onToggleWidget={toggleWidget}
            activePart={activePart}
            draftItemId={shownDraft?.itemId}
            highlight={highlight}
            preview={{
              widgets: canvasWidgets,
              isPending: preview.isPending,
              isFetching: preview.isFetching,
              error: previewError,
            }}
            sections={canvasSections}
            selectedItemId={selectedItemId}
            selectedTabCode={tabCode}
            valueAdornment={valueAdornment}
            valuesPanel={valuesPanel}
          />
        </div>
        {isWide && (
          // Sticky below the top bar with its own scroll, so the inspector
          // stays beside a widget edited far down the canvas. The key starts
          // each item's settings from the top.
          <aside
            className="bg-card sticky top-[calc(4rem+var(--page-padding))] max-h-[calc(100dvh-4rem-2*var(--page-padding))] self-start overflow-y-auto overscroll-contain rounded-lg border p-4"
            key={selectedItem?.id ?? "empty"}
            ref={fitToViewport}
          >
            {selectedItem && (
              <InspectorNav
                item={selectedItem}
                onClose={() => requestSelect(undefined)}
                onSelect={(itemId) => requestSelect(itemId, true)}
                onShow={() => highlightItem(selectedItem.id, true)}
                siblings={tabWidgets}
              />
            )}
            {inspector ?? (
              <div className="space-y-2 text-sm">
                <h2 className="text-strong font-semibold">Inspector</h2>
                <p className="text-muted-foreground">
                  Choose Edit on a widget to change its title, settings or text,
                  or a section&apos;s ⋯ menu to change its colour.
                </p>
                <p className="text-muted-foreground">
                  To change a live number, use the pencil beside the value in
                  the preview. With several channels, choose one in the Channel
                  filter first.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>
      <Drawer
        isOpen={!isWide && Boolean(inspector)}
        onClose={() => requestSelect(undefined)}
        size="wide"
        title={
          selectedItem?.level === "section" ? "Edit section" : "Edit widget"
        }
      >
        {!isWide && inspector}
      </Drawer>
      <ConfirmationDialog
        // Budgets save on their own, so with unsaved budgets the choice is
        // to discard them or go back and save them.
        alternative={
          isBudgetDirty
            ? undefined
            : { label: "Save and continue", onSelect: saveAndContinue }
        }
        body={
          <p>
            {isBudgetDirty
              ? `${pendingTitle} has unsaved budgets. Save them with Save budgets in the inspector, or discard them.`
              : `${pendingTitle} has unsaved changes. Save them before you move on, or discard them.`}
          </p>
        }
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        description="Unsaved changes are lost when you leave this item."
        isOpen={Boolean(pendingSelection)}
        isPending={isSavingToContinue}
        onCancel={() => setPendingSelection(undefined)}
        onConfirm={continuePendingSelection}
        title="Save your changes?"
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
