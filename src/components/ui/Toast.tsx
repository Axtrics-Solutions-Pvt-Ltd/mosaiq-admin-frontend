import { CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
const icons = { info: Info, success: CheckCircle2, error: XCircle };
export function Toast({
  children,
  title,
  tone = "info",
}: {
  children?: ReactNode;
  title: string;
  tone?: "info" | "success" | "error";
}) {
  const Icon = icons[tone];
  return (
    <div
      className={cn(
        "bg-card flex gap-3 rounded-lg border p-4 shadow-lg",
        tone === "success" && "border-green-200",
        tone === "error" && "border-red-200",
      )}
      role="status"
    >
      <Icon
        aria-hidden
        className={cn(
          "text-info mt-0.5 size-5 shrink-0",
          tone === "success" && "text-success",
          tone === "error" && "text-destructive",
        )}
      />
      <div>
        <p className="text-strong font-medium">{title}</p>
        {children && (
          <div className="text-muted-foreground mt-1 text-sm">{children}</div>
        )}
      </div>
    </div>
  );
}
