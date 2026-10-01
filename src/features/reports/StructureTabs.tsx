"use client";

import { ArrowLeft, ArrowRight, EyeOff, Palette } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils/cn";

import type { LayoutItem, ReorderItem, ResolvedAccent } from "./contracts";
import {
  accentStyle,
  itemTitle,
  moveInOrder,
  moveToInOrder,
  toggleInOrder,
} from "./layout";
import {
  DragHandle,
  MoveMenu,
  SortableItems,
  useSortableItem,
} from "./Sortable";

export type TabRowSize = "section" | "tab";

const isShown = (item: LayoutItem) => item.is_enabled && item.is_available;

function StructureTab({
  hasAccent,
  index,
  isSelected,
  item,
  onEdit,
  onReorder,
  onSelect,
  siblings,
  size,
}: {
  // Whether the row's `--section-accent*` variables are set.
  hasAccent: boolean;
  index: number;
  isSelected: boolean;
  item: LayoutItem;
  onEdit?: () => void;
  onReorder: (order: ReorderItem[]) => void;
  onSelect: () => void;
  siblings: readonly LayoutItem[];
  size: TabRowSize;
}) {
  const title = itemTitle(item);
  const { handle, isDragging, setNodeRef, style } = useSortableItem(item.id);
  const move = (offset: -1 | 1) => {
    const order = moveInOrder(siblings, item.id, offset);
    return order ? () => onReorder(order) : undefined;
  };
  return (
    <li
      className={cn(
        // `relative` keeps the sr-only text inside the scrolling row;
        // otherwise it widens the page on phones.
        "relative flex shrink-0 items-center gap-0.5",
        size === "section"
          ? "border-b-2 py-0.5 pr-0.5 pl-0.5"
          : "border-b-2 border-transparent py-1 md:-mb-px",
        // Every section is underlined in its colour, selected or not, so the
        // sections stay distinct from each other at rest.
        size === "section" &&
          (hasAccent
            ? "border-[color:var(--section-accent-strong)]"
            : "border-primary"),
        // Sections are filled in their colour, light at rest and strong when
        // selected, so they read as a level above the underlined tabs. Their
        // checkboxes take the section colour instead of the primary blue.
        size === "section" &&
          !isSelected &&
          hasAccent &&
          "bg-[color:var(--section-accent-soft)] [&_input:checked]:border-[color:var(--section-accent-strong)] [&_input:checked]:bg-[color:var(--section-accent-strong)] [&_input:enabled:hover]:border-[color:var(--section-accent-strong)]",
        size === "section" &&
          isSelected && [
            "[&>button]:text-primary-foreground [&>button:hover]:text-primary-foreground shadow-sm [&_input]:border-white [&_input:checked]:border-white [&_input:checked]:bg-white/25 [&_input:enabled:hover]:border-white [&>button:hover]:bg-white/15",
            hasAccent
              ? "bg-[color:var(--section-accent-strong)]"
              : "bg-primary",
          ],
        // The selected tab is underlined in the section colour.
        size === "tab" &&
          isSelected &&
          hasAccent &&
          "border-[color:var(--section-accent-strong)]",
        size === "tab" && isSelected && !hasAccent && "border-primary",
        isDragging && "bg-card z-10 shadow-md",
        isDragging && size === "tab" && "rounded-md",
      )}
      ref={setNodeRef}
      style={
        size === "section" ? { ...accentStyle(item.accent), ...style } : style
      }
    >
      <DragHandle {...handle} title={title} />
      <Checkbox
        aria-label={`Show ${title} in the portal`}
        checked={item.is_enabled}
        disabled={!item.is_available}
        onChange={(event) =>
          onReorder(toggleInOrder(siblings, item.id, event.target.checked))
        }
      />
      <button
        aria-current={isSelected ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-sm font-medium whitespace-nowrap",
          isSelected
            ? size === "section"
              ? "text-primary-foreground"
              : hasAccent
                ? "text-[color:var(--section-accent-strong)]"
                : "text-primary"
            : size === "section" && hasAccent
              ? "text-[color:var(--section-accent-strong)]"
              : "text-muted-foreground hover:text-strong",
          !isSelected &&
            size === "tab" &&
            hasAccent &&
            "hover:bg-[color:var(--section-accent-soft)]",
          !isShown(item) && "italic",
        )}
        onClick={onSelect}
        type="button"
      >
        {title}
        {!item.is_available ? (
          <Badge tone="neutral">Coming soon</Badge>
        ) : (
          !item.is_enabled && (
            <>
              <EyeOff aria-hidden className="size-3.5" />{" "}
              <span className="sr-only">(hidden from portal)</span>
            </>
          )
        )}
      </button>
      <MoveMenu
        label={onEdit ? `${title} options` : undefined}
        options={[
          {
            label: "Move left",
            icon: ArrowLeft,
            onSelect: index > 0 ? move(-1) : undefined,
          },
          {
            label: "Move right",
            icon: ArrowRight,
            onSelect: index < siblings.length - 1 ? move(1) : undefined,
          },
          ...(onEdit
            ? [{ label: "Colour and title", icon: Palette, onSelect: onEdit }]
            : []),
        ]}
        title={title}
      />
    </li>
  );
}

// Sections or the tabs of one section in the design view: each has a
// checkbox for whether the portal shows it and is dragged (or moved from its
// menu) into order. Each change sends every sibling (PUT layout/order).
// Sections are coloured with their own accent and tabs with their section's
// (`accent`); a section's menu also opens its colour and title (`onEdit`).
export function StructureTabs({
  accent,
  items,
  label,
  onEdit,
  onReorder,
  onSelect,
  selectedId,
  size,
}: {
  accent?: ResolvedAccent | null;
  items: readonly LayoutItem[];
  label: string;
  onEdit?: (item: LayoutItem) => void;
  onReorder: (order: ReorderItem[]) => void;
  onSelect: (item: LayoutItem) => void;
  selectedId: number | undefined;
  size: TabRowSize;
}) {
  return (
    <nav
      aria-label={label}
      style={size === "tab" ? accentStyle(accent) : undefined}
    >
      <SortableItems
        items={items}
        onMove={(id, targetId) => {
          const order = moveToInOrder(items, id, targetId);
          if (order) onReorder(order);
        }}
      >
        <ul
          className={cn(
            // Phones scroll the row sideways instead of wrapping it.
            "flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible",
            size === "section"
              ? "bg-muted w-fit max-w-full rounded-lg border p-1"
              : "border-b",
          )}
        >
          {items.map((item, index) => (
            <StructureTab
              hasAccent={Boolean(size === "section" ? item.accent : accent)}
              index={index}
              isSelected={item.id === selectedId}
              item={item}
              key={item.id}
              onEdit={onEdit && (() => onEdit(item))}
              onReorder={onReorder}
              onSelect={() => onSelect(item)}
              siblings={items}
              size={size}
            />
          ))}
        </ul>
      </SortableItems>
    </nav>
  );
}
