"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
type DrawerProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  side?: "left" | "right";
  size?: "default" | "wide";
  title: string;
};
export function Drawer({
  children,
  isOpen,
  onClose,
  side = "right",
  size = "default",
  title,
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // The shell navigation drawer and a page drawer can be mounted together.
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);
  return (
    <dialog
      data-state={isOpen ? "open" : "closed"}
      aria-labelledby={titleId}
      className={cn(
        "bg-card text-foreground fixed inset-y-0 m-0 h-dvh max-h-none max-w-none border p-0 shadow-[var(--shadow-overlay)]",
        size === "wide"
          ? "w-[min(40rem,calc(100%-2rem))]"
          : "w-[min(22rem,calc(100%-2rem))]",
        side === "right"
          ? "right-0 left-auto border-l"
          : "right-auto left-0 border-r",
      )}
      // Escape asks the owner to close, so it can keep the drawer open (for
      // example to confirm discarding a draft). Events from a nested dialog
      // propagate through the React tree and are ignored.
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => event.target === event.currentTarget && onClose()}
      ref={ref}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-strong text-base font-semibold" id={titleId}>
            {title}
          </h2>
          <Button
            aria-label="Close drawer"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </dialog>
  );
}
