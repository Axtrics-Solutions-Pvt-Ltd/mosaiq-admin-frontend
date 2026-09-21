import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      className={cn(
        "bg-card text-strong placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-primary disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-10 w-full rounded-sm border px-3 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
