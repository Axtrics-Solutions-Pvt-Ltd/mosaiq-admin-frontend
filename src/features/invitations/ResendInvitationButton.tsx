"use client";

import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/errors";

import { useResendInvitation } from "./queries";

function resendErrorMessage(error: unknown) {
  if (!(error instanceof ApiError))
    return "The invitation could not be resent. Please try again.";
  if (error.status === 409)
    return "This invitation can no longer be resent.";
  if (error.status === 404) return "This invitation could not be found.";
  if (error.status === 503)
    return "Email is not set up on the server, so the invitation was not resent.";
  return error.message;
}

export function ResendInvitationButton({
  agencyId,
  email,
  invitationId,
}: {
  agencyId: number;
  email: string;
  invitationId: number;
}) {
  const mutation = useResendInvitation();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        aria-label={`Resend invitation to ${email}`}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate({ agencyId, invitationId })}
        size="sm"
        type="button"
        variant="outline"
      >
        <RotateCw aria-hidden className="size-4" />
        {mutation.isPending ? "Resending..." : "Resend"}
      </Button>
      {mutation.isError && (
        <span className="text-destructive text-xs" role="alert">
          {resendErrorMessage(mutation.error)}
        </span>
      )}
    </span>
  );
}
