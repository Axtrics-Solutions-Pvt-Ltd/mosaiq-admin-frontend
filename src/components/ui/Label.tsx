import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-strong block text-sm font-medium", className)}
      {...props}
    />
  );
}
