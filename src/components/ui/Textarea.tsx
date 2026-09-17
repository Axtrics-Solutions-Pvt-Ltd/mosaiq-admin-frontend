import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "bg-card text-strong placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-primary disabled:bg-muted aria-invalid:border-destructive min-h-28 w-full resize-y rounded-sm border px-3 py-2 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
