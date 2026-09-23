"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { userInvitationsUrl } from "@/config/routes";
import { formatDate } from "@/lib/formatters";

import type { InvitationConflict } from "./contracts";

export function InvitationConflictDialog({
  agencyId,
  conflict,
  isOpen,
  isPending = false,
  onCancel,
  onSendToRemaining,
}: {
  agencyId: number;
  conflict: InvitationConflict;
  isOpen: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onSendToRemaining: () => void;
}) {
  const { already_pending: alreadyPending, creatable } = conflict;
  const hasCreatable = creatable.length > 0;

  return (
    <Dialog
      description={`${alreadyPending.length} workspace${
        alreadyPending.length === 1 ? "" : "s"
      } already ${
        alreadyPending.length === 1 ? "has" : "have"
      } a pending invitation for this email.`}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel} variant="outline">
            {hasCreatable ? "Cancel" : "Close"}
          </Button>
          {hasCreatable && (
            <Button disabled={isPending} onClick={onSendToRemaining}>
              {isPending
                ? "Sending..."
                : `Send to the remaining ${creatable.length} workspace${
                    creatable.length === 1 ? "" : "s"
                  }`}
            </Button>
          )}
        </>
      }
      isOpen={isOpen}
      onClose={isPending ? () => undefined : onCancel}
      title="Some workspaces already have a pending invitation"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-strong text-sm font-medium">Already pending</h3>
          <ul className="mt-2 space-y-2">
            {alreadyPending.map((workspace) => (
              <li
                className="bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                key={workspace.workspace_id}
              >
                <div>
                  <p className="text-strong font-medium">
                    {workspace.workspace_name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Sent {formatDate(workspace.sent_at)} · Expires{" "}
                    {formatDate(workspace.expires_at)}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`${userInvitationsUrl(agencyId)}&workspace=${
                      workspace.workspace_id
                    }`}
                    target="_blank"
                  >
                    View
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
        {hasCreatable && (
          <div>
            <h3 className="text-strong text-sm font-medium">
              Send to the remaining workspace
              {creatable.length === 1 ? "" : "s"}?
            </h3>
            <ul className="mt-2 space-y-1">
              {creatable.map((workspace) => (
                <li className="text-sm" key={workspace.workspace_id}>
                  {workspace.workspace_name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
