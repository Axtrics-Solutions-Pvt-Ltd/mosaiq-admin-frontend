"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils/cn";

import type { LayoutItem, ReorderItem } from "./contracts";
import { holdsWidgets, moveInOrder, toggleInOrder } from "./layout";

export function itemTitle(item: LayoutItem) {
  return item.title ?? item.default_title ?? item.code;
}

function StructureRow({
  isSelected,
  item,
  onReorder,
  onSelect,
  siblings,
}: {
  isSelected: boolean;
  item: LayoutItem;
  onReorder: (order: ReorderItem[]) => void;
  onSelect?: () => void;
  siblings: readonly LayoutItem[];
}) {
  const title = itemTitle(item);
  const index = siblings.findIndex((sibling) => sibling.id === item.id);
  const checkboxId = `structure-${item.id}`;
  const move = (offset: -1 | 1) => {
    const order = moveInOrder(siblings, item.id, offset);
    if (order) onReorder(order);
  };
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5",
        isSelected && "bg-primary-soft",
        !item.is_enabled && "text-muted-foreground",
      )}
    >
      <Checkbox
        aria-label={`Show ${title} in the portal`}
        checked={item.is_enabled}
        disabled={!item.is_available}
        id={checkboxId}
        onChange={(event) =>
          onReorder(toggleInOrder(siblings, item.id, event.target.checked))
        }
      />
      <div className="min-w-0 flex-1">
        {onSelect ? (
          <button
            aria-current={isSelected ? "page" : undefined}
            className={cn(
              "hover:text-primary block w-full truncate text-left text-sm",
              item.is_enabled && "text-strong",
              item.level === "section" && "font-semibold",
            )}
            onClick={onSelect}
            type="button"
          >
            {title}
          </button>
        ) : (
          <span
            className={cn(
              "block truncate text-sm",
              item.level === "section" && "font-semibold",
            )}
          >
            {title}
          </span>
        )}
        {!item.is_available ? (
          <Badge className="mt-0.5" tone="neutral">
            Coming soon
          </Badge>
        ) : (
          !item.is_enabled && (
            <span className="text-muted-foreground text-xs">
              Hidden from portal
            </span>
          )
        )}
      </div>
      <Button
        aria-label={`Move ${title} up`}
        className="size-8"
        disabled={index <= 0}
        onClick={() => move(-1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ArrowUp aria-hidden className="size-4" />
      </Button>
      <Button
        aria-label={`Move ${title} down`}
        className="size-8"
        disabled={index < 0 || index >= siblings.length - 1}
        onClick={() => move(1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ArrowDown aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

// Sections and tabs with their show/hide flags and order. Each change sends
// every sibling of the changed item (PUT layout/order).
export function StructurePanel({
  errorMessage,
  onReorder,
  onSelectTab,
  sections,
  selectedTabCode,
}: {
  errorMessage?: string;
  onReorder: (order: ReorderItem[]) => void;
  onSelectTab: (tabCode: string) => void;
  sections: readonly LayoutItem[];
  selectedTabCode: string | undefined;
}) {
  return (
    <nav aria-label="Report structure" className="space-y-3">
      <div>
        <h2 className="text-strong text-sm font-semibold">Structure</h2>
        <p className="text-muted-foreground text-xs">
          Tick what the portal shows; use the arrows to reorder.
        </p>
      </div>
      {errorMessage && (
        <p
          className="text-destructive rounded-md border p-2 text-xs"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
      <ol className="space-y-2">
        {sections.map((section) => {
          const isFlat = holdsWidgets(section);
          // Opening a section shows its first tab.
          const openCode = isFlat ? section.code : section.children[0]?.code;
          return (
            <li className="rounded-lg border p-1" key={section.id}>
              <StructureRow
                isSelected={isFlat && selectedTabCode === section.code}
                item={section}
                onReorder={onReorder}
                onSelect={openCode ? () => onSelectTab(openCode) : undefined}
                siblings={sections}
              />
              {!isFlat && section.children.length > 0 && (
                <ol className="ml-4 border-l pl-1">
                  {section.children.map((tab) => (
                    <li key={tab.id}>
                      <StructureRow
                        isSelected={selectedTabCode === tab.code}
                        item={tab}
                        onReorder={onReorder}
                        onSelect={() => onSelectTab(tab.code)}
                        siblings={section.children}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
