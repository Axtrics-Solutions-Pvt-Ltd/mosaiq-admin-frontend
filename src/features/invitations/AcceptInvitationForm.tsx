"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { routes } from "@/config/routes";
import { AuthAlert } from "@/features/auth/AuthAlert";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { ApiError } from "@/lib/api/errors";

import {
  acceptInvitationFormSchema,
  type AcceptInvitationFormValues,
} from "./contracts";
import {
  useAcceptInvitation,
  useInspectInvitation,
  useRejectInvitation,
} from "./queries";

function InvalidInvitation() {
  return (
    <AuthAlert tone="danger">
      This invitation link is invalid or has expired. Ask your administrator for
      a new invitation.
    </AuthAlert>
  );
}

function SignInToAccept({ email }: { email: string }) {
  return (
    <div className="space-y-5">
      <AuthAlert>
        {email} already has a MOSAIQ account. Sign in, then open this invitation
        link again to finish linking your access.
      </AuthAlert>
      <Button asChild className="w-full">
        <Link href={routes.login}>Sign in</Link>
      </Button>
    </div>
  );
}

function AcceptedSuccess() {
  return (
    <div className="space-y-5">
      <AuthAlert tone="success">
        Your account is ready. Sign in to continue.
      </AuthAlert>
      <Button asChild className="w-full">
        <Link href={routes.login}>Sign in</Link>
      </Button>
    </div>
  );
}

function RejectedSuccess() {
  return (
    <AuthAlert>
      You have declined this invitation. No account was created. Contact your
      administrator if you change your mind.
    </AuthAlert>
  );
}

export function AcceptInvitationForm() {
  const token = useSearchParams().get("token");
  const inspection = useInspectInvitation(token);
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectErrorMessage, setRejectErrorMessage] = useState<string>();
  const hasAutoAccepted = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues: { name: "", password: "", password_confirmation: "" },
  });

  const requiresExistingLogin = inspection.data?.requires_existing_login;

  useEffect(() => {
    if (
      !token ||
      !requiresExistingLogin ||
      hasAutoAccepted.current ||
      rejectMutation.isSuccess
    )
      return;
    hasAutoAccepted.current = true;
    acceptMutation.mutate({ token });
  }, [token, requiresExistingLogin, acceptMutation, rejectMutation.isSuccess]);

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

  if (inspection.isPending)
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

  if (requiresExistingLogin) {
    if (acceptMutation.isSuccess) return <AcceptedSuccess />;
    if (acceptMutation.isError) {
      if (
        acceptMutation.error instanceof ApiError &&
        acceptMutation.error.status === 401
      )
        return <SignInToAccept email={inspection.data.email} />;
      if (
        acceptMutation.error instanceof ApiError &&
        acceptMutation.error.status === 404
      )
        return <InvalidInvitation />;
      return (
        <AuthAlert tone="danger">
          {acceptMutation.error instanceof ApiError
            ? acceptMutation.error.message
            : "We could not accept this invitation. Please try again."}
        </AuthAlert>
      );
    }
    return <p className="text-muted-foreground">Linking your account...</p>;
  }

  if (acceptMutation.isSuccess) return <AcceptedSuccess />;

  return (
    <form className="space-y-5" noValidate onSubmit={onSubmit}>
      <AuthAlert>
        Activating access for {inspection.data.email} at{" "}
        {inspection.data.agency_name}.
      </AuthAlert>
      {acceptMutation.isError &&
        !(
          acceptMutation.error instanceof ApiError &&
          acceptMutation.error.status === 422
        ) && (
          <AuthAlert tone="danger">
            {acceptMutation.error instanceof ApiError &&
            acceptMutation.error.status === 404
              ? "This invitation link is invalid or has expired. Ask your administrator for a new invitation."
              : acceptMutation.error instanceof ApiError
                ? acceptMutation.error.message
                : "We could not accept this invitation. Please try again."}
          </AuthAlert>
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
      <Button
        className="w-full"
        disabled={acceptMutation.isPending}
        onClick={() => setIsRejectDialogOpen(true)}
        type="button"
        variant="outline"
      >
        Reject invitation
      </Button>
      <ConfirmationDialog
        body={
          <>
            <p>
              You will not gain access to {inspection.data.agency_name}. This
              action cannot be undone.
            </p>
            {rejectErrorMessage && (
              <p className="text-destructive mt-3" role="alert">
                {rejectErrorMessage}
              </p>
            )}
          </>
        }
        confirmLabel={
          rejectMutation.isPending ? "Declining..." : "Reject invitation"
        }
        description="You will not be able to accept this invitation again."
        isOpen={isRejectDialogOpen}
        isPending={rejectMutation.isPending}
        onCancel={() => setIsRejectDialogOpen(false)}
        onConfirm={rejectInvitation}
        title="Reject this invitation?"
      />
    </form>
  );
}
