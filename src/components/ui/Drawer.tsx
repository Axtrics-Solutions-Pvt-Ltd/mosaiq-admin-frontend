"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
type DrawerProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title: string;
};
export function Drawer({
  children,
  isOpen,
  onClose,
  side = "right",
  title,
}: DrawerProps) {
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
      aria-labelledby="drawer-title"
      className={cn(
        "bg-card text-foreground fixed inset-y-0 m-0 h-dvh max-h-none w-[min(22rem,calc(100%-2rem))] max-w-none border p-0 shadow-[var(--shadow-overlay)]",
        side === "right"
          ? "right-0 left-auto border-l"
          : "right-auto left-0 border-r",
      )}
      onCancel={onClose}
      onClose={onClose}
      ref={ref}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-strong text-base font-semibold" id="drawer-title">
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
