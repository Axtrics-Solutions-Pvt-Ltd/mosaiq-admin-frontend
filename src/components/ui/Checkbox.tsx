"use client";

import { Check, Minus } from "lucide-react";
import { type InputHTMLAttributes, useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * `indeterminate` shows a dash for a partly selected group (for example a
 * client with only some of its workspaces chosen).
 */
export function Checkbox({
  className,
  indeterminate = false,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  indeterminate?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className="relative inline-flex size-5 shrink-0">
      <input
        aria-checked={indeterminate ? "mixed" : undefined}
        className={cn(
          // The unchecked border needs 3:1 contrast against the surface (WCAG
          // 1.4.11); the default hairline `border` token is too faint.
          "peer bg-card border-muted-foreground checked:border-primary checked:bg-primary enabled:hover:border-primary size-5 appearance-none rounded border disabled:opacity-50",
          indeterminate && "border-primary bg-primary",
          className,
        )}
        ref={inputRef}
        type="checkbox"
        {...props}
      />
      {indeterminate ? (
        <Minus
          aria-hidden
          className="pointer-events-none absolute inset-0 size-5 p-0.5 text-white"
        />
      ) : (
        <Check
          aria-hidden
          className="pointer-events-none absolute inset-0 size-5 p-0.5 text-white opacity-0 peer-checked:opacity-100"
        />
      )}
    </span>
  );
}
