"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ApiError } from "@/lib/api/errors";

import { useRevokeInvitation } from "./queries";

export function RevokeInvitationButton({
  agencyId,
  invitationId,
  onRevoked,
}: {
  agencyId: number;
  invitationId: number;
  onRevoked?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const mutation = useRevokeInvitation();
  async function revoke() {
    setMessage(undefined);
    try {
      await mutation.mutateAsync({ agencyId, invitationId });
      setIsOpen(false);
      onRevoked?.();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "The invitation could not be revoked. Please try again.",
      );
    }
  }
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        type="button"
        variant="destructive"
      >
        Revoke invitation
      </Button>
      <Dialog
        description="The pending invitation will no longer be usable."
        footer={
          <>
            <Button
              disabled={mutation.isPending}
              onClick={() => setIsOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={revoke}
              variant="destructive"
            >
              {mutation.isPending ? "Revoking..." : "Revoke invitation"}
            </Button>
          </>
        }
        isOpen={isOpen}
        onClose={() => !mutation.isPending && setIsOpen(false)}
        title="Revoke pending invitation?"
      >
        <p>This action cannot be undone.</p>
        {message && (
          <p className="text-destructive mt-3" role="alert">
            {message}
          </p>
        )}
      </Dialog>
    </>
  );
}
