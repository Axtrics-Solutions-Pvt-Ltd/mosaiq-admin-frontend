"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DraggableAttributes,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ellipsis, GripVertical, type LucideIcon } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils/cn";

import type { LayoutItem } from "./contracts";
import { itemTitle } from "./layout";

const iconButton =
  "text-muted-foreground hover:bg-muted hover:text-strong focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

// One drag-and-drop list of siblings. Dropping an item on another's place
// calls `onMove`; the caller turns that into the reorder payload.
export function SortableItems({
  children,
  items,
  onMove,
}: {
  children: ReactNode;
  items: readonly LayoutItem[];
  onMove: (id: number, targetId: number) => void;
}) {
  const contextId = useId();
  const sensors = useSensors(
    // A few pixels of travel before a drag starts keeps a click a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = items.map((item) => item.id);
  const titleOf = (id: UniqueIdentifier) => {
    const item = items.find((candidate) => candidate.id === Number(id));
    return item ? itemTitle(item) : "Item";
  };
  const positionOf = (id: UniqueIdentifier) =>
    `position ${ids.indexOf(Number(id)) + 1} of ${ids.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${titleOf(active.id)} at ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} is over ${positionOf(over.id)}.`
        : `${titleOf(active.id)} is not over a place in the list.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} dropped at ${positionOf(over.id)}.`
        : `${titleOf(active.id)} dropped where it was.`,
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id)
      onMove(Number(active.id), Number(over.id));
  }

  return (
    <DndContext
      accessibility={{ announcements }}
      collisionDetection={closestCenter}
      id={contextId}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

// What a drag handle needs from its item: the element that starts a drag and
// the listeners and ARIA attributes that go on it.
export type SortableHandle = {
  attributes: DraggableAttributes;
  listeners: ReturnType<typeof useSortable>["listeners"];
  activatorRef: (element: HTMLElement | null) => void;
};

export function useSortableItem(id: number, isDisabled = false) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled: isDisabled });
  const handle: SortableHandle = {
    attributes,
    listeners,
    activatorRef: setActivatorNodeRef,
  };
  return {
    handle,
    isDragging,
    setNodeRef,
    // Translate only: widgets of different widths would be stretched by the
    // default scale transform.
    style: {
      transform: CSS.Translate.toString(transform),
      transition,
    } satisfies CSSProperties,
  };
}

export function DragHandle({
  activatorRef,
  attributes,
  listeners,
  title,
}: SortableHandle & { title: string }) {
  return (
    <button
      ref={activatorRef}
      {...attributes}
      {...listeners}
      aria-label={`Drag ${title} to reorder`}
      className={cn(
        iconButton,
        // Touch drags need the browser to leave the pointer alone.
        "cursor-grab touch-none active:cursor-grabbing",
      )}
      type="button"
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  );
}

export type MoveOption = {
  label: string;
  icon?: LucideIcon;
  // Missing when the item is already at that end.
  onSelect?: () => void;
};

const menuWidth = 176;

// The non-drag way to reorder (WCAG 2.5.7). The menu is a popover in the top
// layer, so a sideways-scrolling tab row can't clip it. `label` names the
// menu when it holds more than moves (default "Move {title}").
export function MoveMenu({
  label,
  options,
  title,
}: {
  label?: string;
  options: readonly MoveOption[];
  title: string;
}) {
  const menuLabel = label ?? `Move ${title}`;
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>();
  const [isOpen, setIsOpen] = useState(false);

  // `hidePopover` is missing where the Popover API isn't (jsdom).
  const close = () => menuRef.current?.hidePopover?.();

  // The menu is placed once when it opens, so it closes rather than drift
  // away from its button when the page scrolls.
  useEffect(() => {
    if (!isOpen) return;
    const hide = () => menuRef.current?.hidePopover?.();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [isOpen]);

  function place() {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;
    const left = Math.max(
      8,
      Math.min(trigger.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    const opensUp = trigger.bottom + 120 > window.innerHeight;
    setPosition(
      opensUp
        ? { left, top: "auto", bottom: window.innerHeight - trigger.top + 4 }
        : { left, top: trigger.bottom + 4, bottom: "auto" },
    );
  }

  return (
    <>
      <button
        aria-label={menuLabel}
        className={iconButton}
        popoverTarget={menuId}
        ref={triggerRef}
        type="button"
      >
        <Ellipsis aria-hidden className="size-4" />
      </button>
      <div
        aria-label={menuLabel}
        className="bg-card m-0 w-44 rounded-lg border p-1.5 shadow-[var(--shadow-overlay)]"
        id={menuId}
        onBeforeToggle={(event) => {
          if (event.newState === "open") place();
        }}
        onToggle={(event) => setIsOpen(event.newState === "open")}
        popover="auto"
        ref={menuRef}
        role="group"
        style={position}
      >
        {options.map((option) => (
          <button
            className="hover:bg-muted flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm disabled:pointer-events-none disabled:opacity-50"
            disabled={!option.onSelect}
            key={option.label}
            onClick={() => {
              close();
              option.onSelect?.();
            }}
            type="button"
          >
            {option.icon && (
              <option.icon
                aria-hidden
                className="text-muted-foreground size-4"
              />
            )}
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
