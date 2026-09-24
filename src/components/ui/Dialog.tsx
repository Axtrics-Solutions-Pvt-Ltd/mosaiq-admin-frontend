"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

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
      className="bg-card text-foreground m-auto max-h-[calc(100%-2rem)] w-[min(32rem,calc(100%-2rem))] rounded-xl border p-0 shadow-[var(--shadow-overlay)]"
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
      <div className="p-5">{children}</div>
      {footer && (
        <div className="bg-muted flex flex-wrap justify-end gap-2 border-t p-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}
