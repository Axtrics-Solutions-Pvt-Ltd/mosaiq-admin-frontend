"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
type DialogProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  // Wide holds a table of results; it fills the screen on phones.
  size?: "default" | "wide";
  title: string;
};
export function Dialog({
  children,
  description,
  footer,
  isOpen,
  onClose,
  size = "default",
  title,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Unique ids keep labels correct when one dialog opens over another.
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);
  return (
    <dialog
      data-state={isOpen ? "open" : "closed"}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={cn(
        "bg-card text-foreground m-auto rounded-xl border p-0 shadow-[var(--shadow-overlay)]",
        size === "wide"
          ? // A column, so the footer sits at the bottom of the full-screen
            // phone dialog. Only while open: `flex` would otherwise override
            // the closed dialog's `display: none`.
            "h-full max-h-none w-full max-w-none rounded-none open:flex open:flex-col sm:h-fit sm:max-h-[calc(100%-2rem)] sm:w-[min(56rem,calc(100%-2rem))] sm:rounded-xl"
          : "max-h-[calc(100%-2rem)] w-[min(32rem,calc(100%-2rem))]",
      )}
      // A nested dialog's cancel/close events propagate through the React tree;
      // only this dialog's own events should close it.
      onCancel={(event) => event.target === event.currentTarget && onClose()}
      onClose={(event) => event.target === event.currentTarget && onClose()}
      ref={ref}
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 className="text-strong text-lg font-semibold" id={titleId}>
            {title}
          </h2>
          {description && (
            <p
              className="text-muted-foreground mt-1 text-sm"
              id={descriptionId}
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
      <div className="flex-1 p-5">{children}</div>
      {footer && (
        <div className="bg-muted flex flex-wrap justify-end gap-2 border-t p-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}
