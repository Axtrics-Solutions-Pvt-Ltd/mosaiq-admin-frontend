"use client";

import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ValueAdornment } from "@/features/report-widgets/contracts";
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

import type {
  LayoutItem,
  PreviewWidget,
  ReorderItem,
  ResolvedAccent,
} from "./contracts";
import {
  accentStyle,
  findTab,
  holdsWidgets,
  itemTitle,
  moveInOrder,
  moveToInOrder,
  tabsOf,
} from "./layout";
import {
  DragHandle,
  MoveMenu,
  SortableItems,
  useSortableItem,
} from "./Sortable";
import { StructureTabs } from "./StructureTabs";

const isShown = (item: LayoutItem) => item.is_enabled && item.is_available;

// The portal's read-only section and tab rows, coloured like the portal:
// sections with their own accent, tabs with their section's (`accent`).
function Switcher({
  accent,
  items,
  label,
  onSelect,
  selectedId,
  size,
}: {
  accent?: ResolvedAccent | null;
  items: readonly LayoutItem[];
  label: string;
  onSelect: (item: LayoutItem) => void;
  selectedId: number | undefined;
  size: "section" | "tab";
}) {
  return (
    <nav
      aria-label={label}
      style={size === "tab" ? accentStyle(accent) : undefined}
    >
      <ul
        className={cn(
          "flex flex-wrap gap-1",
          size === "section"
            ? "bg-muted w-fit rounded-lg border p-1"
            : "border-b",
        )}
      >
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const hasAccent = Boolean(size === "section" ? item.accent : accent);
          return (
            <li
              key={item.id}
              style={size === "section" ? accentStyle(item.accent) : undefined}
            >
              <button
                aria-current={isSelected ? "page" : undefined}
                className={cn(
                  "text-sm font-medium",
                  size === "section"
                    ? "rounded-md px-3 py-1.5"
                    : "-mb-px border-b-2 border-transparent px-3 py-2",
                  size === "section" &&
                    isSelected &&
                    (hasAccent
                      ? "bg-[color:var(--section-accent)] text-white shadow-sm"
                      : "bg-card text-strong shadow-sm"),
                  size === "tab" &&
                    isSelected &&
                    (hasAccent
                      ? "border-[color:var(--section-accent-strong)] text-[color:var(--section-accent-strong)]"
                      : "border-primary text-primary"),
                  !isSelected && "text-muted-foreground hover:text-strong",
                  !isSelected &&
                    size === "tab" &&
                    hasAccent &&
                    "hover:bg-[color:var(--section-accent-soft)]",
                  !isShown(item) && "italic",
                )}
                onClick={() => onSelect(item)}
                type="button"
              >
                {itemTitle(item)}
                {!isShown(item) && (
                  <>
                    {" "}
                    <span className="sr-only">(hidden)</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
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
}: {
  canDrag: boolean;
  children: (handle: ReactNode) => ReactNode;
  className?: string;
  item: LayoutItem;
  label?: string;
}) {
  const { handle, isDragging, setNodeRef, style } = useSortableItem(
    item.id,
    !canDrag,
  );
  return (
    <section
      aria-label={label}
      className={cn(
        className,
        isDragging && "relative z-10 rounded-lg shadow-lg",
      )}
      ref={setNodeRef}
      style={style}
    >
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
  budgetsUrl,
  currency,
  isPortalView,
  onChannelSelect,
  onEditSection,
  onEditWidget,
  onReorder,
  onSelectTab,
  onToggleWidget,
  preview,
  sections,
  selectedItemId,
  selectedTabCode,
  valueAdornment,
}: {
  // Where budget pacing without budgets sends the admin to add them.
  budgetsUrl: string;
  currency: string;
  isPortalView: boolean;
  onChannelSelect: (channelCode: string) => void;
  // Opens a section's colour and title in the inspector.
  onEditSection: (itemId: number) => void;
  onEditWidget: (itemId: number) => void;
  // Saves a new order or show/hide flags of one set of siblings.
  onReorder: (order: ReorderItem[]) => void;
  onSelectTab: (tabCode: string) => void;
  onToggleWidget: (item: LayoutItem, isEnabled: boolean) => void;
  preview: CanvasPreview;
  sections: readonly LayoutItem[];
  selectedItemId: number | undefined;
  selectedTabCode: string | undefined;
  valueAdornment: (widget: PreviewWidget) => ValueAdornment | undefined;
}) {
  const canDragWidgets = useMediaQuery("(min-width: 48rem)");
  const visibleSections = isPortalView ? sections.filter(isShown) : sections;
  const selection = selectedTabCode
    ? findTab(sections, selectedTabCode)
    : undefined;
  const sectionTabs = selection
    ? tabsOf(selection.section).filter((tab) => !isPortalView || isShown(tab))
    : [];
  const tab = selection?.tab;
  const isTabHidden =
    Boolean(selection) &&
    (!isShown(selection!.section) || !isShown(selection!.tab));
  const widgets = (tab?.children ?? []).filter(
    (item) => item.level === "widget" && (!isPortalView || isShown(item)),
  );
  const previewById = new Map(
    (preview.widgets ?? []).map((widget) => [widget.editing.item_id, widget]),
  );

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
        <Button
          aria-label={`Edit ${title}`}
          aria-pressed={selectedItemId === item.id}
          className="size-8"
          onClick={() => onEditWidget(item.id)}
          size="icon"
          type="button"
          variant={selectedItemId === item.id ? "secondary" : "ghost"}
        >
          <Pencil aria-hidden className="size-4" />
        </Button>
      </>
    );
  };

  return (
    <div className="space-y-4">
      {isPortalView ? (
        <Switcher
          items={visibleSections}
          label="Report sections"
          onSelect={(section) => {
            const first = tabsOf(section).find(isShown);
            if (first) onSelectTab(first.code);
          }}
          selectedId={selection?.section.id}
          size="section"
        />
      ) : (
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
      )}
      {selection &&
        sectionTabs.length > 0 &&
        !holdsWidgets(selection.section) &&
        (isPortalView ? (
          <Switcher
            accent={selection.section.accent}
            items={sectionTabs}
            label={`${itemTitle(selection.section)} tabs`}
            onSelect={(item) => onSelectTab(item.code)}
            selectedId={tab?.id}
            size="tab"
          />
        ) : (
          <StructureTabs
            accent={selection.section.accent}
            items={sectionTabs}
            label={`${itemTitle(selection.section)} tabs`}
            onReorder={onReorder}
            onSelect={(item) => onSelectTab(item.code)}
            selectedId={tab?.id}
            size="tab"
          />
        ))}
      {!isPortalView && isTabHidden && (
        <p className="bg-muted text-muted-foreground rounded-lg border p-3 text-sm">
          This tab is hidden from the portal. Tick its checkbox above to show
          it.
        </p>
      )}
      {isPortalView && (!selection || isTabHidden) ? (
        <StatePanel
          description="Choose a tab the portal shows, or turn this one on in the design view."
          kind="empty"
          title="Not shown in the portal"
        />
      ) : preview.error ? (
        preview.error
      ) : widgets.length === 0 ? (
        <StatePanel
          description={
            isPortalView
              ? "No widget on this tab is shown in the portal."
              : "This tab has no widgets."
          }
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
              const canDrag = !isPortalView && canDragWidgets;
              if (!widget)
                return (
                  <SortableWidget
                    canDrag={canDrag}
                    className={cn(span || undefined)}
                    item={item}
                    key={item.id}
                  >
                    {(handle) =>
                      preview.isPending || preview.isFetching ? (
                        <Skeleton className="h-48 w-full" />
                      ) : (
                        <WidgetCard
                          actions={
                            isPortalView
                              ? undefined
                              : toolbar(item, index, handle)
                          }
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
              const notice = isPortalView ? undefined : !item.is_available ? (
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
                  canDrag={canDrag}
                  className={cn(
                    span || undefined,
                    !isPortalView && !isShown(item) && "opacity-60",
                    selectedItemId === item.id &&
                      "ring-primary rounded-lg ring-2",
                  )}
                  item={item}
                  key={item.id}
                  label={itemTitle(item)}
                >
                  {(handle) => (
                    <WidgetRenderer
                      actions={
                        isPortalView ? undefined : toolbar(item, index, handle)
                      }
                      currency={currency}
                      emptyAction={
                        !isPortalView &&
                        widget.empty &&
                        widget.reason === "no_budget" ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={budgetsUrl}>
                              <Plus aria-hidden className="size-4" /> Add
                              budgets
                            </Link>
                          </Button>
                        ) : undefined
                      }
                      notice={notice}
                      onChannelSelect={onChannelSelect}
                      valueAdornment={
                        isPortalView ? undefined : valueAdornment(widget)
                      }
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
