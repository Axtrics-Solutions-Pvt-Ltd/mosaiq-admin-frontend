"use client";
import { type ReactNode, useId, useState } from "react";

import { cn } from "@/lib/utils/cn";
export type TabOption = { content: ReactNode; label: string; value: string };
export function Tabs({
  defaultValue,
  items,
}: {
  defaultValue?: string;
  items: readonly TabOption[];
}) {
  const baseId = useId();
  const [active, setActive] = useState(defaultValue ?? items[0]?.value ?? "");
  return (
    <div>
      <div
        aria-label="Preview sections"
        className="flex gap-1 border-b"
        role="tablist"
      >
        {items.map((item) => (
          <button
            aria-controls={`${baseId}-panel-${item.value}`}
            aria-selected={active === item.value}
            className={cn(
              "text-muted-foreground hover:text-strong border-b-2 border-transparent px-3 py-2 text-sm font-medium",
              active === item.value && "border-primary text-primary",
            )}
            id={`${baseId}-tab-${item.value}`}
            key={item.value}
            onClick={() => setActive(item.value)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          aria-labelledby={`${baseId}-tab-${item.value}`}
          className="pt-4"
          hidden={active !== item.value}
          id={`${baseId}-panel-${item.value}`}
          key={item.value}
          role="tabpanel"
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
