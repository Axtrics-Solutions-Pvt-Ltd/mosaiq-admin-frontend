"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus } from "lucide-react";
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

import type { LayoutItem, PreviewWidget } from "./contracts";
import { findTab, holdsWidgets, tabsOf } from "./layout";
import { itemTitle } from "./StructurePanel";

const isShown = (item: LayoutItem) => item.is_enabled && item.is_available;

function Switcher({
  items,
  label,
  onSelect,
  selectedId,
  size,
}: {
  items: readonly LayoutItem[];
  label: string;
  onSelect: (item: LayoutItem) => void;
  selectedId: number | undefined;
  size: "section" | "tab";
}) {
  return (
    <nav aria-label={label}>
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
          return (
            <li key={item.id}>
              <button
                aria-current={isSelected ? "page" : undefined}
                className={cn(
                  "text-sm font-medium",
                  size === "section"
                    ? "rounded-md px-3 py-1.5"
                    : "-mb-px border-b-2 border-transparent px-3 py-2",
                  size === "section" &&
                    isSelected &&
                    "bg-card text-strong shadow-sm",
                  size === "tab" && isSelected && "border-primary text-primary",
                  !isSelected && "text-muted-foreground hover:text-strong",
                  !isShown(item) && "italic",
                )}
                onClick={() => onSelect(item)}
                type="button"
              >
                {itemTitle(item)}
                {!isShown(item) && <span className="sr-only"> (hidden)</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
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
  onEditWidget,
  onMoveWidget,
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
  onEditWidget: (itemId: number) => void;
  onMoveWidget: (tab: LayoutItem, itemId: number, offset: -1 | 1) => void;
  onSelectTab: (tabCode: string) => void;
  onToggleWidget: (item: LayoutItem, isEnabled: boolean) => void;
  preview: CanvasPreview;
  sections: readonly LayoutItem[];
  selectedItemId: number | undefined;
  selectedTabCode: string | undefined;
  valueAdornment: (widget: PreviewWidget) => ValueAdornment | undefined;
}) {
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

  const toolbar = (item: LayoutItem, index: number) => {
    const title = itemTitle(item);
    return (
      <>
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
        <Button
          aria-label={`Move ${title} up`}
          className="size-8"
          disabled={index === 0}
          onClick={() => tab && onMoveWidget(tab, item.id, -1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowUp aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label={`Move ${title} down`}
          className="size-8"
          disabled={index === widgets.length - 1}
          onClick={() => tab && onMoveWidget(tab, item.id, 1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowDown aria-hidden className="size-4" />
        </Button>
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
      <Switcher
        items={visibleSections}
        label="Report sections"
        onSelect={(section) => {
          const first = tabsOf(section).find(
            (candidate) => !isPortalView || isShown(candidate),
          );
          if (first) onSelectTab(first.code);
        }}
        selectedId={selection?.section.id}
        size="section"
      />
      {selection &&
        sectionTabs.length > 0 &&
        !holdsWidgets(selection.section) && (
          <Switcher
            items={sectionTabs}
            label={`${itemTitle(selection.section)} tabs`}
            onSelect={(item) => onSelectTab(item.code)}
            selectedId={tab?.id}
            size="tab"
          />
        )}
      {!isPortalView && isTabHidden && (
        <p className="bg-muted text-muted-foreground rounded-lg border p-3 text-sm">
          This tab is hidden from the portal. Tick it in Structure to show it.
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
                <div className={cn(span || undefined)} key={item.id}>
                  {preview.isPending || preview.isFetching ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <WidgetCard
                      actions={isPortalView ? undefined : toolbar(item, index)}
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
                  )}
                </div>
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
              <section
                aria-label={itemTitle(item)}
                className={cn(
                  span || undefined,
                  !isPortalView && !isShown(item) && "opacity-60",
                  selectedItemId === item.id &&
                    "ring-primary rounded-lg ring-2",
                )}
                key={item.id}
              >
                <WidgetRenderer
                  actions={isPortalView ? undefined : toolbar(item, index)}
                  currency={currency}
                  emptyAction={
                    !isPortalView &&
                    widget.empty &&
                    widget.reason === "no_budget" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={budgetsUrl}>
                          <Plus aria-hidden className="size-4" /> Add budgets
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
