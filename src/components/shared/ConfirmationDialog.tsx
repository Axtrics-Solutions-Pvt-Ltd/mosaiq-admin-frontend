"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function ConfirmationDialog({
  alternative,
  body,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm action",
  description,
  isConfirmDisabled = false,
  isOpen,
  isPending = false,
  onCancel,
  onConfirm,
  title,
}: {
  // A safer way through than the destructive action, e.g. "Save and
  // continue" beside "Discard changes". It is the primary button.
  alternative?: { label: string; onSelect: () => void };
  body: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  // For confirmations that need extra input first, such as typing a name.
  isConfirmDisabled?: boolean;
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
            {cancelLabel}
          </Button>
          <Button
            disabled={isPending || isConfirmDisabled}
            onClick={onConfirm}
            variant="destructive"
          >
            {confirmLabel}
          </Button>
          {alternative && (
            <Button disabled={isPending} onClick={alternative.onSelect}>
              {alternative.label}
            </Button>
          )}
        </>
      }
      isOpen={isOpen}
      onClose={isPending ? () => undefined : onCancel}
      title={title}
    >
      {body}
    </Dialog>
  );
}
