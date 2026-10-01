"use client";

import { Eye, EyeOff, Plus, Settings2 } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  type ValueAdornment,
  type ValuesPanel,
  type WidgetPart,
  widgetPartOf,
} from "@/features/report-widgets/contracts";
import {
  WidgetCard,
  WidgetMessage,
} from "@/features/report-widgets/WidgetCard";
import {
  isFullWidthWidget,
  WidgetRenderer,
} from "@/features/report-widgets/WidgetRenderer";
import { cn } from "@/lib/utils/cn";
import { useMediaQuery } from "@/lib/utils/useMediaQuery";

import type { LayoutItem, PreviewWidget, ReorderItem } from "./contracts";
import {
  findTab,
  holdsWidgets,
  itemTitle,
  layoutItemElementId,
  moveInOrder,
  moveToInOrder,
  tabsOf,
  withPausedTabs,
} from "./layout";
import {
  DragHandle,
  MoveMenu,
  SortableItems,
  useSortableItem,
} from "./Sortable";
import { StructureTabs } from "./StructureTabs";

const isShown = (item: LayoutItem) => item.is_enabled && item.is_available;

// Clicks on these keep their own meaning instead of opening the widget. A
// chart slice filters the preview by channel.
const ownClickTargets =
  "a, button, input, select, textarea, label, summary, [popover], [role=button], .recharts-sector";

// The card's open state: a tag above the card that names it as the one in
// the inspector, and a short flash whenever it is opened or asked for. The
// flash replays when its key changes and stops after a few pulses (WCAG
// 2.2.2); reduced motion turns it off.
function EditingMarker({
  hasDraft,
  highlightKey,
  isSelected,
}: {
  hasDraft: boolean;
  highlightKey: number | undefined;
  isSelected: boolean;
}) {
  return (
    <>
      {isSelected && (
        <span className="bg-primary text-primary-foreground absolute -top-2.5 left-3 z-10 rounded-sm px-1.5 text-xs leading-5 font-medium shadow-sm">
          {hasDraft ? "Editing · unsaved preview" : "Editing"}
        </span>
      )}
      {highlightKey !== undefined && (
        <span
          aria-hidden
          className="animate-editing-highlight pointer-events-none absolute inset-0 rounded-lg"
          key={highlightKey}
        />
      )}
    </>
  );
}

// One widget in the design grid. The grip is left out on phones, where the
// single column would make a drag fight the page scroll; its menu still
// moves it.
function SortableWidget({
  canDrag,
  children,
  className,
  item,
  label,
  activePart,
  marker,
  onPick,
}: {
  canDrag: boolean;
  children: (handle: ReactNode) => ReactNode;
  className?: string;
  item: LayoutItem;
  label?: string;
  // The part whose inspector field has focus, outlined on the card.
  activePart?: WidgetPart;
  marker?: ReactNode;
  // A click on the card itself opens it, at the field for the part clicked.
  // The toolbar's Edit button stays the keyboard way in.
  onPick?: (part: WidgetPart | undefined) => void;
}) {
  const { handle, isDragging, setNodeRef, style } = useSortableItem(
    item.id,
    !canDrag,
  );
  function pick(event: MouseEvent) {
    if (!onPick || (event.target as Element).closest(ownClickTargets)) return;
    // Selecting text to copy it isn't a pick.
    if (window.getSelection()?.toString()) return;
    onPick(widgetPartOf(event.target as Element));
  }
  return (
    <section
      aria-label={label}
      data-active-part={activePart}
      className={cn(
        // Keeps a revealed widget clear of the sticky top bar.
        "relative scroll-mt-[calc(4rem+var(--page-padding))]",

        className,
        isDragging && "z-10 rounded-lg shadow-lg",
      )}
      id={layoutItemElementId(item.id)}
      onClick={pick}
      ref={setNodeRef}
      style={style}
    >
      {marker}
      {children(
        canDrag ? <DragHandle {...handle} title={itemTitle(item)} /> : null,
      )}
    </section>
  );
}

export type CanvasPreview = {
  widgets: readonly PreviewWidget[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: ReactNode;
};

export function ReportCanvas({
  activePart,
  currency,
  draftItemId,
  highlight,
  onAddBudgets,
  onChannelSelect,
  onEditSection,
  onEditWidget,
  onPickWidget,
  onReorder,
  onSelectTab,
  onToggleWidget,
  preview,
  sections,
  selectedItemId,
  selectedTabCode,
  valueAdornment,
  valuesPanel,
}: {
  // The selected widget's part whose inspector field has focus.
  activePart?: WidgetPart;
  currency: string;
  // The item whose unsaved edits the canvas shows.
  draftItemId?: number;
  // Flashes a widget each time `count` changes.
  highlight?: { itemId: number; count: number };
  // Opens budget pacing's monthly budgets in the inspector.
  onAddBudgets: (itemId: number) => void;
  onChannelSelect: (channelCode: string) => void;
  // Opens a section's colour and title in the inspector.
  onEditSection: (itemId: number) => void;
  onEditWidget: (itemId: number) => void;
  onPickWidget?: (itemId: number, part: WidgetPart | undefined) => void;
  // Saves a new order or show/hide flags of one set of siblings.
  onReorder: (order: ReorderItem[]) => void;
  onSelectTab: (tabCode: string) => void;
  onToggleWidget: (item: LayoutItem, isEnabled: boolean) => void;
  preview: CanvasPreview;
  sections: readonly LayoutItem[];
  selectedItemId: number | undefined;
  selectedTabCode: string | undefined;
  valueAdornment: (widget: PreviewWidget) => ValueAdornment | undefined;
  valuesPanel?: (widget: PreviewWidget) => ValuesPanel | undefined;
}) {
  const canDragWidgets = useMediaQuery("(min-width: 48rem)");
  const selection = selectedTabCode
    ? findTab(sections, selectedTabCode)
    : undefined;
  const sectionTabs = selection ? tabsOf(selection.section) : [];
  const tab = selection?.tab;
  const isTabHidden =
    Boolean(selection) &&
    (!isShown(selection!.section) || !isShown(selection!.tab));
  const widgets = (tab?.children ?? []).filter(
    (item) => item.level === "widget",
  );
  const previewById = new Map(
    (preview.widgets ?? []).map((widget) => [widget.editing.item_id, widget]),
  );

  const hasSelectedWidget = widgets.some((item) => item.id === selectedItemId);
  const marker = (item: LayoutItem) => (
    <EditingMarker
      hasDraft={draftItemId === item.id}
      highlightKey={highlight?.itemId === item.id ? highlight.count : undefined}
      isSelected={selectedItemId === item.id}
    />
  );
  // While a widget is open the others step back, and come forward again on
  // hover or focus so they stay easy to reach.
  const cardTone = (item: LayoutItem) =>
    cn(
      hasSelectedWidget &&
        selectedItemId !== item.id &&
        "opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100",
      !isShown(item) && "opacity-60",
      selectedItemId === item.id && "ring-primary rounded-lg ring-2",
      onPickWidget && selectedItemId !== item.id && "cursor-pointer",
    );
  // The open widget stays pickable, so a click on a part of it still jumps
  // to that part's field.
  const pickFor = (item: LayoutItem) =>
    onPickWidget
      ? (part: WidgetPart | undefined) => onPickWidget(item.id, part)
      : undefined;
  const activePartFor = (item: LayoutItem) =>
    selectedItemId === item.id ? activePart : undefined;

  const moveWidget = (item: LayoutItem, offset: -1 | 1) => {
    const order = tab && moveInOrder(tab.children, item.id, offset);
    return order ? () => onReorder(order) : undefined;
  };

  const toolbar = (item: LayoutItem, index: number, handle: ReactNode) => {
    const title = itemTitle(item);
    return (
      <>
        {handle}
        <Button
          aria-label={
            item.is_enabled
              ? `Hide ${title} from the portal`
              : `Show ${title} in the portal`
          }
          aria-pressed={!item.is_enabled}
          className="size-8"
          disabled={!item.is_available}
          onClick={() => onToggleWidget(item, !item.is_enabled)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {item.is_enabled ? (
            <Eye aria-hidden className="size-4" />
          ) : (
            <EyeOff aria-hidden className="size-4" />
          )}
        </Button>
        <MoveMenu
          options={[
            {
              label: "Move up",
              onSelect: index > 0 ? moveWidget(item, -1) : undefined,
            },
            {
              label: "Move down",
              onSelect:
                index < widgets.length - 1 ? moveWidget(item, 1) : undefined,
            },
          ]}
          title={title}
        />
        {/* Settings, not a pencil: the pencil beside a value corrects the
            data, and the two looked the same. */}
        <Button
          aria-label={`Edit ${title}`}
          aria-pressed={selectedItemId === item.id}
          className="h-8 min-h-8 px-2.5"
          onClick={() => onEditWidget(item.id)}
          size="sm"
          type="button"
          variant={selectedItemId === item.id ? "secondary" : "outline"}
        >
          <Settings2 aria-hidden className="size-4" /> Edit
        </Button>
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* One group, so the tab panel hangs straight off its section. */}
      <div>
        <StructureTabs
          items={sections}
          label="Report sections"
          onEdit={(section) => onEditSection(section.id)}
          onReorder={onReorder}
          onSelect={(section) => {
            const first = tabsOf(section)[0];
            if (first) onSelectTab(first.code);
          }}
          selectedId={selection?.section.id}
          size="section"
        />
        {selection &&
          sectionTabs.length > 0 &&
          !holdsWidgets(selection.section) && (
            <StructureTabs
              accent={selection.section.accent}
              items={sectionTabs}
              label={`${itemTitle(selection.section)} tabs`}
              onReorder={(order) =>
                onReorder(withPausedTabs(selection.section, order))
              }
              onSelect={(item) => onSelectTab(item.code)}
              selectedId={tab?.id}
              size="tab"
            />
          )}
      </div>
      {isTabHidden && (
        <p className="bg-muted text-muted-foreground rounded-lg border p-3 text-sm">
          This tab is hidden from the portal. Tick its checkbox above to show
          it.
        </p>
      )}
      {preview.error ? (
        preview.error
      ) : widgets.length === 0 ? (
        <StatePanel
          description="This tab has no widgets."
          kind="empty"
          title="Nothing to show"
        />
      ) : (
        <SortableItems
          items={widgets}
          onMove={(id, targetId) => {
            const order = tab && moveToInOrder(tab.children, id, targetId);
            if (order) onReorder(order);
          }}
        >
          <div
            aria-busy={preview.isFetching}
            className={cn(
              "grid gap-4 lg:grid-cols-2",
              preview.isFetching && !preview.isPending && "opacity-80",
            )}
          >
            {widgets.map((item, index) => {
              const widget = previewById.get(item.id);
              const span = isFullWidthWidget(item.type) && "lg:col-span-2";
              if (!widget)
                return (
                  <SortableWidget
                    canDrag={canDragWidgets}
                    className={cn(span || undefined, cardTone(item))}
                    item={item}
                    key={item.id}
                    activePart={activePartFor(item)}
                    marker={marker(item)}
                    onPick={pickFor(item)}
                  >
                    {(handle) =>
                      preview.isPending || preview.isFetching ? (
                        <Skeleton className="h-48 w-full" />
                      ) : (
                        <WidgetCard
                          actions={toolbar(item, index, handle)}
                          envelope={{
                            code: item.code,
                            type: item.type,
                            kind: item.kind ?? "live",
                            title: itemTitle(item),
                            empty: true,
                          }}
                        >
                          <WidgetMessage>
                            Not included in this preview.
                          </WidgetMessage>
                        </WidgetCard>
                      )
                    }
                  </SortableWidget>
                );
              const notice = !item.is_available ? (
                <Badge className="mt-1.5" tone="neutral">
                  Coming soon
                </Badge>
              ) : (
                !item.is_enabled && (
                  <Badge className="mt-1.5" tone="warning">
                    <EyeOff aria-hidden className="size-3" /> Hidden from portal
                  </Badge>
                )
              );
              return (
                <SortableWidget
                  canDrag={canDragWidgets}
                  className={cn(span || undefined, cardTone(item))}
                  item={item}
                  key={item.id}
                  label={itemTitle(item)}
                  activePart={activePartFor(item)}
                  marker={marker(item)}
                  onPick={pickFor(item)}
                >
                  {(handle) => (
                    <WidgetRenderer
                      actions={toolbar(item, index, handle)}
                      currency={currency}
                      emptyAction={
                        widget.empty && widget.reason === "no_budget" ? (
                          <Button
                            onClick={() => onAddBudgets(item.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Plus aria-hidden className="size-4" /> Add budgets
                          </Button>
                        ) : undefined
                      }
                      notice={notice}
                      onChannelSelect={onChannelSelect}
                      valueAdornment={valueAdornment(widget)}
                      valuesPanel={valuesPanel?.(widget)}
                      widget={{ ...widget, title: itemTitle(item) }}
                    />
                  )}
                </SortableWidget>
              );
            })}
          </div>
        </SortableItems>
      )}
    </div>
  );
}
