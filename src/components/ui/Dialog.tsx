"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
type DialogProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};
export function Dialog({
  children,
  description,
  footer,
  isOpen,
  onClose,
  title,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);
  return (
    <dialog
      data-state={isOpen ? "open" : "closed"}
      aria-describedby={description ? "dialog-description" : undefined}
      aria-labelledby="dialog-title"
      className="bg-card text-foreground m-auto max-h-[calc(100%-2rem)] w-[min(32rem,calc(100%-2rem))] rounded-xl border p-0 shadow-[var(--shadow-overlay)]"
      onCancel={onClose}
      onClose={onClose}
      ref={ref}
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 className="text-strong text-lg font-semibold" id="dialog-title">
            {title}
          </h2>
          {description && (
            <p
              className="text-muted-foreground mt-1 text-sm"
              id="dialog-description"
            >
              {description}
            </p>
          )}
        </div>
        <Button
          aria-label="Close dialog"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-5">{children}</div>
      {footer && (
        <div className="bg-muted flex flex-wrap justify-end gap-2 border-t p-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}
