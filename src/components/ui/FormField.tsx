import type { ReactNode } from "react";

import { Label } from "@/components/ui/Label";
export function FormField({
  children,
  description,
  error,
  id,
  label,
  required,
}: {
  children: ReactNode;
  description?: string;
  error?: string;
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            {" "}
            *
          </span>
        )}
      </Label>
      {children}
      {description && !error && (
        <p className="text-muted-foreground text-xs" id={`${id}-description`}>
          {description}
        </p>
      )}
      {error && (
        <p
          className="text-destructive text-xs font-medium"
          id={`${id}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
