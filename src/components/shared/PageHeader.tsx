import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
export function PageHeader({
  actions,
  breadcrumbs,
  context,
  description,
  isPreview,
  title,
}: {
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  context?: string;
  description: string;
  isPreview?: boolean;
  title: string;
}) {
  return (
    <header>
      {breadcrumbs && (
        <div className="text-muted-foreground mb-3 text-sm">{breadcrumbs}</div>
      )}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          {context && (
            <p className="text-primary mb-1 text-xs font-medium">{context}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-strong text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              {title}
            </h1>
            {isPreview && <Badge tone="primary">UI preview</Badge>}
          </div>
          <p className="text-muted-foreground mt-2 max-w-3xl">{description}</p>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
