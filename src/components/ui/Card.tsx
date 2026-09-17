import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card rounded-lg border shadow-sm", className)}
      {...props}
    />
  );
}
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 pb-2 sm:p-5 sm:pb-2", className)} {...props} />
  );
}
export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-strong text-base font-semibold", className)}
      {...props}
    />
  );
}
export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 pt-2 sm:p-5 sm:pt-3", className)} {...props} />
  );
}
