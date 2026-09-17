"use client";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
export function ConfirmationDialog({
  confirmLabel = "Confirm action",
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel?: string;
  description: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <Dialog
      description={description}
      footer={
        <>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="destructive">
            {confirmLabel}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
    >
      <p>
        This UI preview demonstrates the shared confirmation pattern. No data
        will be changed.
      </p>
    </Dialog>
  );
}
