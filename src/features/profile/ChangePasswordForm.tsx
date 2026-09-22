"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { AuthAlert } from "@/features/auth/AuthAlert";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { ApiError } from "@/lib/api/errors";

import { type ChangePasswordPayload, changePasswordSchema } from "./contracts";
import { useChangePassword } from "./queries";

export function ChangePasswordForm() {
  const mutation = useChangePassword();
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordPayload>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSuccess(false);
    try {
      await mutation.mutateAsync(values);
      reset();
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of [
          "current_password",
          "password",
          "password_confirmation",
        ] as const) {
          if (error.fieldErrors[field]) {
            setError(field, { message: error.fieldErrors[field] });
          }
        }
      }
    }
  });

  return (
    <form className="max-w-lg space-y-5" noValidate onSubmit={onSubmit}>
      {isSuccess && (
        <AuthAlert tone="success">
          Password updated. You&apos;ve been signed out of your other sessions
          and devices.
        </AuthAlert>
      )}
      {mutation.isError && !isSuccess && (
        <AuthAlert tone="danger">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : "We could not update your password. Please try again."}
        </AuthAlert>
      )}
      <FormField
        error={errors.current_password?.message}
        id="current-password"
        label="Current password"
        required
      >
        <PasswordInput
          aria-describedby={
            errors.current_password ? "current-password-error" : undefined
          }
          aria-invalid={Boolean(errors.current_password)}
          autoComplete="current-password"
          id="current-password"
          {...register("current_password")}
        />
      </FormField>
      <FormField
        error={errors.password?.message}
        id="profile-new-password"
        label="New password"
        required
      >
        <PasswordInput
          aria-describedby={
            errors.password ? "profile-new-password-error" : undefined
          }
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          id="profile-new-password"
          {...register("password")}
        />
      </FormField>
      <FormField
        error={errors.password_confirmation?.message}
        id="profile-confirm-password"
        label="Confirm new password"
        required
      >
        <PasswordInput
          aria-describedby={
            errors.password_confirmation
              ? "profile-confirm-password-error"
              : undefined
          }
          aria-invalid={Boolean(errors.password_confirmation)}
          autoComplete="new-password"
          id="profile-confirm-password"
          {...register("password_confirmation")}
        />
      </FormField>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending && (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        )}
        {mutation.isPending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
