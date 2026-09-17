import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-foreground",
        primary: "border-blue-200 bg-primary-soft text-blue-800",
        success: "border-green-200 bg-success-soft text-success",
        warning: "border-amber-200 bg-warning-soft text-warning",
        danger: "border-red-200 bg-destructive-soft text-destructive",
        info: "border-sky-200 bg-info-soft text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);
type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;
export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
export { badgeVariants };
