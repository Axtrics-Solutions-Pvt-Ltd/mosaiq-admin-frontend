import { Blocks } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function BrandMark({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg shadow-sm",
          inverse ? "bg-white text-blue-700" : "bg-primary text-white",
        )}
      >
        <Blocks aria-hidden className="size-5" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p
            className={cn(
              "font-semibold tracking-tight",
              inverse ? "text-white" : "text-strong",
            )}
          >
            MOSAIQ
          </p>
          <p
            className={cn(
              "text-xs",
              inverse ? "text-blue-200" : "text-muted-foreground",
            )}
          >
            Admin portal
          </p>
        </div>
      )}
    </div>
  );
}
