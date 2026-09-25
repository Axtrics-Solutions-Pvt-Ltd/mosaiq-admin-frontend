"use client";

import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";

import { getInvitationAccessScope, type MyInvitation } from "./contracts";
import { invitationRoleLabels, wholeClientLabel } from "./labels";
import { useAcceptMyInvitation, useRejectMyInvitation } from "./queries";

type AgencyGroup = {
  agencyId: number;
  agencyName: string;
  invitations: MyInvitation[];
};

// Each invitation covers one workspace, so an agency can appear several times.
function groupByAgency(invitations: readonly MyInvitation[]) {
  const groups = new Map<number, AgencyGroup>();
  for (const invitation of invitations) {
    const group = groups.get(invitation.agency_id);
    if (group) group.invitations.push(invitation);
    else
      groups.set(invitation.agency_id, {
        agencyId: invitation.agency_id,
        agencyName: invitation.agency_name,
        invitations: [invitation],
      });
  }
  return [...groups.values()];
}

function invitationScopeLabel(invitation: MyInvitation) {
  const scope = getInvitationAccessScope(invitation);
  if (scope === "client")
    return wholeClientLabel(invitation.client_name, invitation.workspace_count);
  if (scope === "workspace") return invitation.workspace_name ?? "Workspace";
  return "Agency-wide access";
}

function actionErrorMessage(error: unknown, action: "accept" | "decline") {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "That invitation is no longer available. It may have expired or been withdrawn.";
    if (error.errorCode === "USER_NOT_INVITABLE")
      return "Your account already belongs to another agency, so this invitation cannot be accepted.";
    return error.message;
  }
  return `The invitation could not be ${action === "accept" ? "accepted" : "declined"}. Please try again.`;
}

export function MyInvitationList({
  invitations,
}: {
  invitations: readonly MyInvitation[];
}) {
  const acceptMutation = useAcceptMyInvitation();
  const rejectMutation = useRejectMyInvitation();
  const [declineTarget, setDeclineTarget] = useState<MyInvitation>();
  const [declineErrorMessage, setDeclineErrorMessage] = useState<string>();
  const [listErrorMessage, setListErrorMessage] = useState<string>();
  const isBusy = acceptMutation.isPending || rejectMutation.isPending;

  async function accept(invitation: MyInvitation) {
    setListErrorMessage(undefined);
    try {
      await acceptMutation.mutateAsync(invitation.id);
    } catch (error) {
      setListErrorMessage(actionErrorMessage(error, "accept"));
    }
  }

  async function confirmDecline() {
    if (!declineTarget) return;
    setDeclineErrorMessage(undefined);
    setListErrorMessage(undefined);
    try {
      await rejectMutation.mutateAsync(declineTarget.id);
      setDeclineTarget(undefined);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setDeclineTarget(undefined);
        setListErrorMessage(actionErrorMessage(error, "decline"));
        return;
      }
      setDeclineErrorMessage(actionErrorMessage(error, "decline"));
    }
  }

  return (
    <div className="space-y-4">
      {listErrorMessage && (
        <p
          className="border-destructive/30 bg-destructive-soft text-destructive rounded-lg border p-3 text-sm"
          role="alert"
        >
          {listErrorMessage}
        </p>
      )}
      {groupByAgency(invitations).map((group) => (
        <section
          aria-labelledby={`my-invitations-agency-${group.agencyId}`}
          className="rounded-lg border"
          key={group.agencyId}
        >
          <h3
            className="text-strong bg-muted rounded-t-lg border-b px-4 py-2.5 text-sm font-semibold"
            id={`my-invitations-agency-${group.agencyId}`}
          >
            {group.agencyName}
          </h3>
          <ul className="divide-y">
            {group.invitations.map((invitation) => {
              const scopeLabel = invitationScopeLabel(invitation);
              const isAccepting =
                acceptMutation.isPending &&
                acceptMutation.variables === invitation.id;
              return (
                <li
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={invitation.id}
                >
                  <div className="min-w-0">
                    <p className="text-strong font-medium break-words">
                      {scopeLabel}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {invitationRoleLabels[invitation.role_code]}
                      {invitation.client_name &&
                        getInvitationAccessScope(invitation) !== "client" &&
                        ` · ${invitation.client_name}`}{" "}
                      · Expires{" "}
                      <time dateTime={invitation.expires_at}>
                        {formatDate(invitation.expires_at)}
                      </time>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      aria-label={`Accept invitation to ${scopeLabel}`}
                      disabled={isBusy}
                      onClick={() => accept(invitation)}
                      size="sm"
                      type="button"
                    >
                      {isAccepting ? "Accepting..." : "Accept"}
                    </Button>
                    <Button
                      aria-label={`Decline invitation to ${scopeLabel}`}
                      disabled={isBusy}
                      onClick={() => {
                        setDeclineErrorMessage(undefined);
                        setDeclineTarget(invitation);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <ConfirmationDialog
        body={
          <>
            <p>
              You will not gain access to{" "}
              {declineTarget ? invitationScopeLabel(declineTarget) : ""} at{" "}
              {declineTarget?.agency_name}. This action cannot be undone.
            </p>
            {declineErrorMessage && (
              <p className="text-destructive mt-3" role="alert">
                {declineErrorMessage}
              </p>
            )}
          </>
        }
        confirmLabel={
          rejectMutation.isPending ? "Declining..." : "Decline invitation"
        }
        description="You will not be able to accept this invitation again."
        isOpen={Boolean(declineTarget)}
        isPending={rejectMutation.isPending}
        onCancel={() => setDeclineTarget(undefined)}
        onConfirm={confirmDecline}
        title="Decline this invitation?"
      />
    </div>
  );
}
