import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

export function AuthAlert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "danger" | "info" | "success";
}) {
  const Icon =
    tone === "danger" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  const classes =
    tone === "danger"
      ? "border-red-200 bg-destructive-soft text-destructive"
      : tone === "success"
        ? "border-green-200 bg-success-soft text-success"
        : "border-blue-200 bg-primary-soft text-blue-800";
  return (
    <div
      className={"flex gap-3 rounded-lg border p-3 text-sm " + classes}
      role="status"
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
