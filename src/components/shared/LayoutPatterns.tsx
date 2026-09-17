import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
export function PageStack({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-[var(--section-gap)]", className)} {...props} />
  );
}
export function CardGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
      {...props}
    />
  );
}
export function FormGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-2", className)} {...props} />
  );
}
export function FilterBar({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end",
        className,
      )}
      {...props}
    />
  );
}
export function TableSurface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card overflow-x-auto rounded-lg border", className)}
      {...props}
    />
  );
}
export function ChartSurface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card min-h-72 rounded-lg border p-4 sm:p-5", className)}
      {...props}
    />
  );
}
export function DrawerSection({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("border-b py-4 last:border-0", className)}
      {...props}
    />
  );
}
export function PageSection({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={cn("space-y-4", className)} {...props} />;
}
export function PageSectionHeading({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-strong text-xl font-semibold", className)}
      {...props}
    />
  );
}
