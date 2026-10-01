"use client";

import { ArrowLeft, ArrowRight, EyeOff, Palette } from "lucide-react";
import type { CSSProperties } from "react";

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

// A section without its own colour, or a tab row whose section has none,
// falls back to the primary blue.
const primaryAccent = {
  "--section-accent": "var(--color-primary)",
  "--section-accent-strong": "var(--color-primary)",
  "--section-accent-soft": "var(--color-primary-soft)",
} as CSSProperties;

const accentVars = (accent: ResolvedAccent | null | undefined) =>
  accentStyle(accent) ?? primaryAccent;

// The grip and ⋯ menu stay out of the way until the item is hovered or
// focused, so the row reads as navigation. Touch screens have no hover, so
// they always show them.
const accentCheckbox =
  "[&_input:checked]:border-[color:var(--section-accent-strong)] [&_input:checked]:bg-[color:var(--section-accent-strong)] [&_input:enabled:hover]:border-[color:var(--section-accent-strong)]";

const revealOnHover =
  "flex opacity-0 transition-opacity group-focus-within/tab:opacity-100 group-hover/tab:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none";

function StructureTab({
  index,
  isSelected,
  item,
  onEdit,
  onReorder,
  onSelect,
  siblings,
  size,
}: {
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
  const reveal = cn(revealOnHover, isSelected && "opacity-100");
  return (
    <li
      className={cn(
        // `relative` keeps the sr-only text inside the scrolling row;
        // otherwise it widens the page on phones.
        "group/tab relative flex shrink-0 items-center gap-0.5",
        size === "section"
          ? "px-1 py-1"
          : "border-b-2 border-transparent px-0.5 py-1 md:-mb-px",
        // Every item is in its section's colour: checkboxes ticked in it, and
        // sections tinted with their own at rest so they stay distinct.
        accentCheckbox,
        size === "section" &&
          !isSelected &&
          "bg-[color:var(--section-accent-soft)] hover:brightness-95",
        // The selected section is filled in the strong colour, with white
        // text, controls and checkbox, as the header of the light tab panel
        // below.
        size === "section" &&
          isSelected &&
          "[&>button]:text-primary-foreground [&>div>button]:text-primary-foreground [&>span>button]:text-primary-foreground bg-[color:var(--section-accent-strong)] shadow-sm [&_input]:border-white [&_input:checked]:border-white [&_input:checked]:bg-white/25 [&_input:enabled:hover]:border-white [&>div>button:hover]:bg-white/15 [&>span>button:hover]:bg-white/15",
        // The active tab is underlined in the strong colour, on the panel's
        // own bottom line.
        size === "tab" &&
          isSelected &&
          "border-[color:var(--section-accent-strong)]",
        isDragging && "z-20 shadow-md",
        isDragging && !isSelected && "bg-card",
      )}
      ref={setNodeRef}
      style={
        size === "section" ? { ...accentVars(item.accent), ...style } : style
      }
    >
      <span className={reveal}>
        <DragHandle {...handle} title={title} />
      </span>
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
          "inline-flex items-center gap-1.5 px-2 py-1 whitespace-nowrap",
          size === "section" ? "font-semibold" : "text-sm font-medium",
          size === "tab" && !isSelected
            ? "text-muted-foreground hover:text-strong"
            : !(size === "section" && isSelected) &&
                "text-[color:var(--section-accent-strong)]",
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
      <div className={reveal}>
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
      </div>
    </li>
  );
}

// Sections or the tabs of one section in the design view: each has a
// checkbox for whether the portal shows it and is dragged (or moved from its
// menu) into order. Each change sends every sibling (PUT layout/order).
// The selected section and its tabs read as one header and panel in the
// section's colour (`accent` for the tab row); a section's menu also opens its
// colour and title (`onEdit`).
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
      style={size === "tab" ? accentVars(accent) : undefined}
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
            "flex gap-1 overflow-x-auto",
            // Sections stay on one line, scrolling sideways when they don't
            // fit, so the selected one always sits on its tab panel: the
            // light version of its colour, underlined.
            size === "section"
              ? ""
              : "border-b border-[color:var(--section-accent)]/30 bg-[color:var(--section-accent-soft)] px-1 md:flex-wrap md:overflow-visible",
          )}
        >
          {items.map((item, index) => (
            <StructureTab
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
