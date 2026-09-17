"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/Input";

export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        className={"pr-11 " + (className ?? "")}
        type={isVisible ? "text" : "password"}
      />
      <button
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="text-muted-foreground hover:text-strong absolute inset-y-0 right-0 grid w-11 place-items-center"
        onClick={() => setIsVisible((value) => !value)}
        type="button"
      >
        {isVisible ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}
