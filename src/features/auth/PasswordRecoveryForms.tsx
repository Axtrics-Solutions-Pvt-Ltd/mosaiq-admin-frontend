"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { routes } from "@/config/routes";
import { AuthAlert } from "@/features/auth/AuthAlert";
import { PasswordInput } from "@/features/auth/PasswordInput";
import {
  useRequestPasswordReset,
  useResetPassword,
} from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid work email address.")),
});
type EmailValues = z.infer<typeof emailSchema>;

const resetSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters."),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords must match.",
    path: ["password_confirmation"],
  });
type ResetValues = z.infer<typeof resetSchema>;

export function ForgotPasswordForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const mutation = useRequestPasswordReset();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await mutation.mutateAsync(email);
      setIsSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.email) {
        setError("email", { message: error.fieldErrors.email });
      }
    }
  });

  if (isSubmitted) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">
          If your account is eligible, a password reset link has been sent to
          your email.
        </AuthAlert>
        <Button
          className="w-full"
          onClick={() => setIsSubmitted(false)}
          variant="outline"
        >
          Try another email
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" noValidate onSubmit={onSubmit}>
      {mutation.isError && (
        <AuthAlert tone="danger">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : "We could not request a reset link. Please try again."}
        </AuthAlert>
      )}
      <FormField
        error={errors.email?.message}
        id="forgot-email"
        label="Work email"
        required
      >
        <Input
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="forgot-email"
          placeholder="name@company.com"
          type="email"
          {...register("email")}
        />
      </FormField>
      <Button className="w-full" disabled={mutation.isPending} type="submit">
        {mutation.isPending && (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        )}
        {mutation.isPending ? "Sending..." : "Request reset link"}
      </Button>
    </form>
  );
}

type ResetLink = { email: string; token: string };

function subscribeToHashChange(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHash() {
  return window.location.hash;
}

export function ResetPasswordForm() {
  const hash = useSyncExternalStore(subscribeToHashChange, getHash, () => "");
  const [isInvalidLink, setIsInvalidLink] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const mutation = useResetPassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });

  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("token");
  const email = params.get("email");
  const resetLink: ResetLink | null = token && email ? { token, email } : null;

  const onSubmit = handleSubmit(async (values) => {
    if (!resetLink) return;
    try {
      await mutation.mutateAsync({ ...resetLink, ...values });
      window.history.replaceState(null, "", routes.resetPassword);
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors.token) setIsInvalidLink(true);
        for (const field of ["password", "password_confirmation"] as const) {
          if (error.fieldErrors[field]) {
            setError(field, { message: error.fieldErrors[field] });
          }
        }
      }
    }
  });

  if (!hash)
    return <p className="text-muted-foreground">Checking reset link...</p>;

  if (isInvalidLink || !resetLink) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="danger">
          This reset link is invalid or has expired.
        </AuthAlert>
        <Button asChild className="w-full">
          <Link href={routes.forgotPassword}>Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">
          Your password has been updated. Sign in again to continue.
        </AuthAlert>
        <Button asChild className="w-full">
          <Link href={routes.login}>Return to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" noValidate onSubmit={onSubmit}>
      {mutation.isError && (
        <AuthAlert tone="danger">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : "We could not update your password. Please try again."}
        </AuthAlert>
      )}
      <FormField
        error={errors.password?.message}
        id="reset-password"
        label="New password"
        required
      >
        <PasswordInput
          aria-describedby={
            errors.password ? "reset-password-error" : undefined
          }
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          id="reset-password"
          {...register("password")}
        />
      </FormField>
      <FormField
        error={errors.password_confirmation?.message}
        id="reset-confirm"
        label="Confirm new password"
        required
      >
        <PasswordInput
          aria-describedby={
            errors.password_confirmation ? "reset-confirm-error" : undefined
          }
          aria-invalid={Boolean(errors.password_confirmation)}
          autoComplete="new-password"
          id="reset-confirm"
          {...register("password_confirmation")}
        />
      </FormField>
      <Button className="w-full" disabled={mutation.isPending} type="submit">
        {mutation.isPending && (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        )}
        {mutation.isPending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
