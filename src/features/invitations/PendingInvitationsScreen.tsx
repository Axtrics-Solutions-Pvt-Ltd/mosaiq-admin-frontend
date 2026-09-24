"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { routes } from "@/config/routes";
import { AuthAlert } from "@/features/auth/AuthAlert";
import { needsPendingInvitations } from "@/features/auth/contracts";
import { useCurrentUser, useLogout } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";

import { MyInvitationList } from "./MyInvitationList";
import { useMyInvitations } from "./queries";

// Signed-in users without an agency membership land here after sign-in.
// Accepting an invitation gives them a membership, at which point /auth/me
// refetches and they continue to the dashboard.
export function PendingInvitationsScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const logoutMutation = useLogout();
  const [signOutErrorMessage, setSignOutErrorMessage] = useState<string>();
  const user = currentUser.data;
  const isWaitingOnInvitation = user ? needsPendingInvitations(user) : false;
  const invitationsQuery = useMyInvitations({
    enabled: isWaitingOnInvitation,
  });
  const isSignedOut =
    currentUser.error instanceof ApiError && currentUser.error.status === 401;
  // Sign-out navigates on its own; do not race it with the redirects below.
  const isSigningOut = logoutMutation.isPending || logoutMutation.isSuccess;

  useEffect(() => {
    if (isSigningOut) return;
    if (isSignedOut) router.replace(routes.login);
    else if (user && !isWaitingOnInvitation) {
      router.replace(routes.dashboard);
      router.refresh();
    }
  }, [isSignedOut, isSigningOut, isWaitingOnInvitation, router, user]);

  async function signOut() {
    setSignOutErrorMessage(undefined);
    try {
      await logoutMutation.mutateAsync();
      router.replace(routes.signedOut);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace(routes.login);
        return;
      }
      setSignOutErrorMessage("We could not sign you out. Please try again.");
    }
  }

  if (currentUser.isPending || (user && !isWaitingOnInvitation) || isSignedOut)
    return <p className="text-muted-foreground">Checking your access...</p>;

  if (currentUser.isError)
    return (
      <div className="space-y-4">
        <AuthAlert tone="danger">
          We could not confirm your account. Please try again.
        </AuthAlert>
        <Button
          className="w-full"
          onClick={() => currentUser.refetch()}
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">
        Signed in as{" "}
        <strong className="text-strong font-medium">{user?.email}</strong>
      </p>
      {invitationsQuery.isPending && (
        <p className="text-muted-foreground">Loading your invitations...</p>
      )}
      {invitationsQuery.isError && (
        <div className="space-y-3">
          <AuthAlert tone="danger">
            Your invitations could not be loaded. Please try again.
          </AuthAlert>
          <Button
            className="w-full"
            onClick={() => invitationsQuery.refetch()}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      )}
      {invitationsQuery.isSuccess && invitationsQuery.data.length === 0 && (
        <AuthAlert>
          You do not currently have access to an agency, and there are no
          invitations waiting for you. Ask your administrator to invite you.
        </AuthAlert>
      )}
      {invitationsQuery.isSuccess && invitationsQuery.data.length > 0 && (
        <MyInvitationList invitations={invitationsQuery.data} />
      )}
      {signOutErrorMessage && (
        <AuthAlert tone="danger">{signOutErrorMessage}</AuthAlert>
      )}
      <Button
        className="w-full"
        disabled={logoutMutation.isPending}
        onClick={signOut}
        type="button"
        variant="outline"
      >
        {logoutMutation.isPending ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}
