"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import {
  acceptInvitationUrl,
  loginWithReturnUrl,
  routes,
} from "@/config/routes";
import { AuthAlert } from "@/features/auth/AuthAlert";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { useCurrentUser, useLogout } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";

import {
  acceptInvitationFormSchema,
  type AcceptInvitationFormValues,
  getInvitationAccessScope,
  type InvitationInspection,
} from "./contracts";
import { invitationRoleLabels, wholeClientLabel } from "./labels";
import {
  useAcceptInvitation,
  useInspectInvitation,
  useRejectInvitation,
} from "./queries";

function isSameEmail(first: string, second: string) {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

function InvalidInvitation() {
  return (
    <AuthAlert tone="danger">
      This invitation link is invalid or has expired. Ask your administrator for
      a new invitation.
    </AuthAlert>
  );
}

function RejectedSuccess() {
  return (
    <AuthAlert>
      You have declined this invitation. No access was granted. Contact your
      administrator if you change your mind.
    </AuthAlert>
  );
}

function InvitationSummary({
  invitation,
}: {
  invitation: InvitationInspection;
}) {
  const items: { label: string; value: ReactNode }[] = [
    { label: "Invited email", value: invitation.email },
    { label: "Agency", value: invitation.agency_name },
    { label: "Role", value: invitationRoleLabels[invitation.role_code] },
  ];
  if (invitation.client_name)
    items.push({ label: "Client", value: invitation.client_name });
  if (invitation.workspace_name)
    items.push({ label: "Workspace", value: invitation.workspace_name });
  else if (getInvitationAccessScope(invitation) === "client")
    items.push({
      label: "Workspaces",
      value: wholeClientLabel(null, invitation.workspace_count),
    });
  items.push({
    label: "Expires",
    value: (
      <time dateTime={invitation.expires_at}>
        {formatDate(invitation.expires_at)}
      </time>
    ),
  });
  return (
    <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div className="min-w-0" key={item.label}>
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd className="text-strong mt-0.5 font-medium break-words">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function acceptErrorMessage(error: ApiError | undefined) {
  if (!error) return "We could not accept this invitation. Please try again.";
  if (error.errorCode === "USER_NOT_INVITABLE")
    return "This account already belongs to another agency, so this invitation cannot be accepted. Contact your administrator.";
  return error.message;
}

export function AcceptInvitationForm() {
  const token = useSearchParams().get("token");
  const inspection = useInspectInvitation(token);
  const currentUser = useCurrentUser();
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const logoutMutation = useLogout();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectErrorMessage, setRejectErrorMessage] = useState<string>();
  const [signOutErrorMessage, setSignOutErrorMessage] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues: { name: "", password: "", password_confirmation: "" },
  });

  async function rejectInvitation() {
    if (!token) return;
    setRejectErrorMessage(undefined);
    try {
      await rejectMutation.mutateAsync(token);
      setIsRejectDialogOpen(false);
    } catch (error) {
      setRejectErrorMessage(
        error instanceof ApiError
          ? error.message
          : "This invitation could not be declined. Please try again.",
      );
    }
  }

  async function signOutAndContinue() {
    setSignOutErrorMessage(undefined);
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // An expired session is already signed out; anything else is a failure.
      if (!(error instanceof ApiError && error.status === 401)) {
        setSignOutErrorMessage("We could not sign you out. Please try again.");
        return;
      }
      await currentUser.refetch();
    }
    acceptMutation.reset();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    try {
      await acceptMutation.mutateAsync({ token, ...values });
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of [
          "name",
          "password",
          "password_confirmation",
        ] as const) {
          if (error.fieldErrors[field])
            setError(field, { message: error.fieldErrors[field] });
        }
      }
    }
  });

  if (!token) return <InvalidInvitation />;

  if (rejectMutation.isSuccess) return <RejectedSuccess />;

  if (inspection.isPending || currentUser.isPending)
    return <p className="text-muted-foreground">Checking invitation...</p>;

  if (inspection.isError) {
    if (inspection.error instanceof ApiError && inspection.error.status === 404)
      return <InvalidInvitation />;
    return (
      <AuthAlert tone="danger">
        {inspection.error instanceof ApiError
          ? inspection.error.message
          : "We could not check this invitation. Please try again."}
      </AuthAlert>
    );
  }

  const invitation = inspection.data;
  const acceptError =
    acceptMutation.error instanceof ApiError ? acceptMutation.error : undefined;
  if (acceptError?.status === 404) return <InvalidInvitation />;

  // A failed /auth/me (normally 401) is treated as signed out; Laravel still
  // enforces who may accept.
  const signedInUser = currentUser.data;
  const isSessionLost = acceptError?.status === 401;
  const isSignedIn = Boolean(signedInUser) && !isSessionLost;
  const isWrongAccount =
    acceptError?.errorCode === "INVITATION_EMAIL_MISMATCH" ||
    (isSignedIn &&
      signedInUser !== undefined &&
      !isSameEmail(signedInUser.email, invitation.email));

  const declineButton = (
    <Button
      className="w-full"
      disabled={acceptMutation.isPending || logoutMutation.isPending}
      onClick={() => setIsRejectDialogOpen(true)}
      type="button"
      variant="outline"
    >
      Decline invitation
    </Button>
  );

  let content: ReactNode;
  if (acceptMutation.isSuccess && invitation.requires_existing_login) {
    content = (
      <div className="space-y-5">
        <AuthAlert tone="success">
          You now have access to{" "}
          {invitation.workspace_name
            ? `${invitation.workspace_name} at ${invitation.agency_name}`
            : invitation.client_name
              ? `${invitation.client_name} at ${invitation.agency_name}`
              : invitation.agency_name}
          .
        </AuthAlert>
        <Button asChild className="w-full">
          <Link href={routes.dashboard}>Go to dashboard</Link>
        </Button>
      </div>
    );
  } else if (acceptMutation.isSuccess) {
    content = (
      <div className="space-y-5">
        <AuthAlert tone="success">
          Your account is ready. Sign in to continue.
        </AuthAlert>
        <Button asChild className="w-full">
          <Link href={routes.login}>Sign in</Link>
        </Button>
      </div>
    );
  } else if (isWrongAccount) {
    content = (
      <div className="space-y-5">
        <InvitationSummary invitation={invitation} />
        <AuthAlert>
          This invitation is for {invitation.email}
          {signedInUser
            ? `, but you are signed in as ${signedInUser.email}`
            : ""}
          . Sign out, then continue with the invited account.
        </AuthAlert>
        {signOutErrorMessage && (
          <AuthAlert tone="danger">{signOutErrorMessage}</AuthAlert>
        )}
        <Button
          className="w-full"
          disabled={logoutMutation.isPending}
          onClick={signOutAndContinue}
          type="button"
        >
          {logoutMutation.isPending && (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          )}
          {logoutMutation.isPending
            ? "Signing out..."
            : "Sign out and continue"}
        </Button>
        {declineButton}
      </div>
    );
  } else if (acceptError?.errorCode === "USER_NOT_INVITABLE") {
    content = (
      <div className="space-y-5">
        <InvitationSummary invitation={invitation} />
        <AuthAlert tone="danger">{acceptErrorMessage(acceptError)}</AuthAlert>
      </div>
    );
  } else if (invitation.requires_existing_login && !isSignedIn) {
    content = (
      <div className="space-y-5">
        <InvitationSummary invitation={invitation} />
        <AuthAlert>
          {isSessionLost
            ? "Your session has ended. "
            : `${invitation.email} already has a MOSAIQ account. `}
          Sign in with that account to accept. You will come straight back to
          this invitation.
        </AuthAlert>
        <Button asChild className="w-full">
          <Link href={loginWithReturnUrl(acceptInvitationUrl(token))}>
            Sign in to accept
          </Link>
        </Button>
        {declineButton}
      </div>
    );
  } else if (invitation.requires_existing_login) {
    content = (
      <div className="space-y-5">
        <InvitationSummary invitation={invitation} />
        {acceptMutation.isError && (
          <AuthAlert tone="danger">{acceptErrorMessage(acceptError)}</AuthAlert>
        )}
        <Button
          className="w-full"
          disabled={acceptMutation.isPending}
          onClick={() => acceptMutation.mutate({ token })}
          type="button"
        >
          {acceptMutation.isPending && (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          )}
          {acceptMutation.isPending ? "Accepting..." : "Accept invitation"}
        </Button>
        {declineButton}
      </div>
    );
  } else {
    content = (
      <form className="space-y-5" noValidate onSubmit={onSubmit}>
        <InvitationSummary invitation={invitation} />
        {acceptMutation.isError && acceptError?.status !== 422 && (
          <AuthAlert tone="danger">{acceptErrorMessage(acceptError)}</AuthAlert>
        )}
        <FormField
          error={errors.name?.message}
          id="accept-name"
          label="Full name"
          required
        >
          <Input
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            id="accept-name"
            {...register("name")}
          />
        </FormField>
        <FormField
          error={errors.password?.message}
          id="accept-password"
          label="Create password"
          required
        >
          <PasswordInput
            aria-invalid={Boolean(errors.password)}
            autoComplete="new-password"
            id="accept-password"
            {...register("password")}
          />
        </FormField>
        <FormField
          error={errors.password_confirmation?.message}
          id="accept-confirm"
          label="Confirm password"
          required
        >
          <PasswordInput
            aria-invalid={Boolean(errors.password_confirmation)}
            autoComplete="new-password"
            id="accept-confirm"
            {...register("password_confirmation")}
          />
        </FormField>
        <Button
          className="w-full"
          disabled={acceptMutation.isPending}
          type="submit"
        >
          {acceptMutation.isPending && (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          )}
          {acceptMutation.isPending ? "Activating..." : "Activate account"}
        </Button>
        {declineButton}
      </form>
    );
  }

  return (
    <>
      {content}
      <ConfirmationDialog
        body={
          <>
            <p>
              You will not gain access to {invitation.agency_name}. This action
              cannot be undone.
            </p>
            {rejectErrorMessage && (
              <p className="text-destructive mt-3" role="alert">
                {rejectErrorMessage}
              </p>
            )}
          </>
        }
        confirmLabel={
          rejectMutation.isPending ? "Declining..." : "Decline invitation"
        }
        description="You will not be able to accept this invitation again."
        isOpen={isRejectDialogOpen}
        isPending={rejectMutation.isPending}
        onCancel={() => setIsRejectDialogOpen(false)}
        onConfirm={rejectInvitation}
        title="Decline this invitation?"
      />
    </>
  );
}
