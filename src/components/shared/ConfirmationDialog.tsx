"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function ConfirmationDialog({
  body,
  confirmLabel = "Confirm action",
  description,
  isOpen,
  isPending = false,
  onCancel,
  onConfirm,
  title,
}: {
  body?: ReactNode;
  confirmLabel?: string;
  description: string;
  isOpen: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <Dialog
      description={description}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={onConfirm}
            variant="destructive"
          >
            {confirmLabel}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={isPending ? () => undefined : onCancel}
      title={title}
    >
      {body ?? (
        <p>
          This UI preview demonstrates the shared confirmation pattern. No data
          will be changed.
        </p>
      )}
    </Dialog>
  );
}
