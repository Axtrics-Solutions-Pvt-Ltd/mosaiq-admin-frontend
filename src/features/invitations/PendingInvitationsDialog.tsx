"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { CurrentUser } from "@/features/auth/contracts";

import { MyInvitationList } from "./MyInvitationList";
import { useMyInvitations } from "./queries";

const dismissedStorageKey = "mosaiq:pending-invitations-dismissed";

function readDismissed() {
  try {
    return window.sessionStorage.getItem(dismissedStorageKey) === "true";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.sessionStorage.setItem(dismissedStorageKey, "true");
  } catch {
    // Storage can be unavailable (private mode); dismissal then lasts until
    // the next page load, which is acceptable.
  }
}

// Members of an agency can receive further invitations (one per workspace).
// Users without a membership are handled on their own page instead.
export function PendingInvitationsDialog({ user }: { user: CurrentUser }) {
  const [isDismissed, setIsDismissed] = useState(() =>
    typeof window === "undefined" ? false : readDismissed(),
  );
  const isEligible =
    user.membership !== null && user.platformRoleCode !== "SUPER_ADMIN";
  // Failures are silent here: this prompt is a convenience, not a workflow.
  const invitationsQuery = useMyInvitations({
    enabled: isEligible && !isDismissed,
  });
  const invitations = invitationsQuery.data ?? [];

  function dismiss() {
    writeDismissed();
    setIsDismissed(true);
  }

  return (
    <Dialog
      description="Accept to add these workspaces to your account, or decline them."
      footer={
        <Button onClick={dismiss} type="button" variant="outline">
          Later
        </Button>
      }
      isOpen={isEligible && !isDismissed && invitations.length > 0}
      onClose={dismiss}
      title="You have new invitations"
    >
      {invitations.length > 0 && <MyInvitationList invitations={invitations} />}
    </Dialog>
  );
}
