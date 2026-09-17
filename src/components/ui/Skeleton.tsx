import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-skeleton rounded-sm bg-slate-200", className)}
      {...props}
    />
  );
}
