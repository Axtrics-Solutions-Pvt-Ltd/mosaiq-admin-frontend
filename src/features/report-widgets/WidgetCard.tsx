import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils/cn";

import type { WidgetEnvelope } from "./contracts";

// The card every widget renders in. `actions` is the builder's toolbar slot;
// the portal renders the same card without it.
export function WidgetCard({
  actions,
  children,
  className,
  envelope,
  notice,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  envelope: WidgetEnvelope;
  notice?: ReactNode;
}) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <header className="flex items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div className="min-w-0">
          <h3 className="text-strong text-base font-semibold">
            {envelope.title ?? envelope.code}
          </h3>
          {envelope.subtitle && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {envelope.subtitle}
            </p>
          )}
          {envelope.as_of && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              As of {formatDate(envelope.as_of)}
            </p>
          )}
          {notice}
        </div>
        {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
      </header>
      <div className="flex-1 p-4 pt-2 sm:p-5 sm:pt-3">{children}</div>
    </Card>
  );
}

export function WidgetMessage({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground bg-muted rounded-lg border border-dashed p-4 text-sm">
      {children}
    </p>
  );
}
