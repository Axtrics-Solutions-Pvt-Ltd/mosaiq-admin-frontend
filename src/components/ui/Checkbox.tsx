import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
export function Checkbox({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <span className="relative inline-flex size-5 shrink-0">
      <input
        type="checkbox"
        className={cn(
          "peer bg-card checked:border-primary checked:bg-primary size-5 appearance-none rounded border disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden
        className="pointer-events-none absolute inset-0 size-5 p-0.5 text-white opacity-0 peer-checked:opacity-100"
      />
    </span>
  );
}
