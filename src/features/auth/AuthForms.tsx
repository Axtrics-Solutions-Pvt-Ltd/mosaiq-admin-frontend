"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { routes } from "@/config/routes";
import { AuthAlert } from "@/features/auth/AuthAlert";
import { canSignIntoAdmin } from "@/features/auth/contracts";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { useLogin } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";

type PreviewState =
  | "default"
  | "field-error"
  | "pending"
  | "invalid"
  | "unavailable"
  | "submitted"
  | "success"
  | "expired";

function PreviewSelector({
  options,
  state,
  setState,
}: {
  options: { label: string; value: PreviewState }[];
  state: PreviewState;
  setState: (state: PreviewState) => void;
}) {
  return (
    <div className="bg-muted mb-5 rounded-lg border p-3">
      <Label htmlFor="preview-state">Review visual state</Label>
      <Select
        className="mt-1.5"
        id="preview-state"
        onChange={(event) => setState(event.target.value as PreviewState)}
        value={state}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <p className="text-muted-foreground mt-1.5 text-xs">
        Local display control for design review.
      </p>
    </div>
  );
}

function SubmitButton({
  isPending,
  label,
}: {
  isPending: boolean;
  label: string;
}) {
  return (
    <Button className="w-full" disabled={isPending} type="submit">
      {isPending && (
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
      )}
      {isPending ? "Please wait..." : label}
    </Button>
  );
}

const loginSchema = z.object({
  email: z.email("Enter a valid work email address."),
  password: z.string().min(1, "Enter your password."),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ reason }: { reason?: string }) {
  const router = useRouter();
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await loginMutation.mutateAsync(values);
      router.replace(
        canSignIntoAdmin(user)
          ? routes.dashboard
          : `${routes.forbidden}?reason=client-portal`,
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of ["email", "password"] as const) {
          if (error.fieldErrors[field])
            setError(field, { message: error.fieldErrors[field] });
        }
      }
    }
  });
  const apiError =
    loginMutation.error instanceof ApiError ? loginMutation.error : undefined;
  return (
    <form className="space-y-5" method="post" noValidate onSubmit={onSubmit}>
      {reason === "signed-out" && (
        <AuthAlert tone="success">You have signed out.</AuthAlert>
      )}
      {reason === "session-expired" && (
        <AuthAlert>
          Your session has ended. Sign in again to continue.
        </AuthAlert>
      )}
      {apiError && (
        <AuthAlert tone="danger">
          {apiError.message}
          {apiError.requestId && ` Reference: ${apiError.requestId}`}
        </AuthAlert>
      )}
      {loginMutation.error && !apiError && (
        <AuthAlert tone="danger">
          We could not sign you in. Please try again.
        </AuthAlert>
      )}
      <FormField
        error={errors.email?.message}
        id="login-email"
        label="Work email"
        required
      >
        <Input
          aria-describedby={errors.email ? "login-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="login-email"
          placeholder="name@company.com"
          type="email"
          {...register("email")}
        />
      </FormField>
      <FormField
        error={errors.password?.message}
        id="login-password"
        label="Password"
        required
      >
        <PasswordInput
          aria-describedby={
            errors.password ? "login-password-error" : undefined
          }
          aria-invalid={Boolean(errors.password)}
          autoComplete="current-password"
          id="login-password"
          {...register("password")}
        />
      </FormField>
      <div className="flex items-center justify-between gap-4">
        <label
          className="text-muted-foreground flex items-center gap-2 text-sm"
          title="Remember me is not yet supported by the API"
        >
          <Checkbox disabled /> Remember me (unavailable)
        </label>
        <Link
          className="text-primary text-sm font-medium hover:underline"
          href={routes.forgotPassword}
        >
          Forgot password?
        </Link>
      </div>
      <SubmitButton isPending={loginMutation.isPending} label="Sign in" />
      <p className="text-muted-foreground text-center text-xs">
        Need access?{" "}
        <Link
          className="text-primary font-medium hover:underline"
          href={routes.signup}
        >
          Activate an invited account
        </Link>{" "}
        or contact your administrator.
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, setState] = useState<PreviewState>("default");
  const error = state === "field-error" ? "Passwords must match." : undefined;
  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setState("unavailable");
      }}
    >
      <AuthAlert>
        Admin access is invite-only. A valid invitation will be required when
        account activation is connected.
      </AuthAlert>
      <PreviewSelector
        state={state}
        setState={setState}
        options={[
          { label: "Default", value: "default" },
          { label: "Field error", value: "field-error" },
          { label: "Activating", value: "pending" },
          { label: "Invalid invitation", value: "invalid" },
          { label: "Service unavailable", value: "unavailable" },
          { label: "Success preview", value: "success" },
        ]}
      />
      {state === "invalid" && (
        <AuthAlert tone="danger">
          This invitation is invalid or has expired. Ask your administrator for
          a new invitation.
        </AuthAlert>
      )}
      {state === "unavailable" && (
        <AuthAlert tone="danger">
          Account activation is unavailable in this UI preview. No account was
          created.
        </AuthAlert>
      )}
      {state === "success" && (
        <AuthAlert tone="success">
          Account activation success presentation. No account was created.
        </AuthAlert>
      )}
      <FormField id="signup-name" label="Full name" required>
        <Input autoComplete="name" id="signup-name" name="name" />
      </FormField>
      <FormField id="signup-email" label="Invited email" required>
        <Input
          autoComplete="email"
          id="signup-email"
          name="email"
          type="email"
        />
      </FormField>
      <FormField
        description="The final password policy requires API agreement."
        id="signup-password"
        label="Create password"
        required
      >
        <PasswordInput
          aria-describedby="signup-password-description"
          autoComplete="new-password"
          id="signup-password"
          name="password"
        />
      </FormField>
      <FormField
        error={error}
        id="signup-confirm"
        label="Confirm password"
        required
      >
        <PasswordInput
          aria-describedby={error ? "signup-confirm-error" : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="new-password"
          id="signup-confirm"
          name="confirmPassword"
        />
      </FormField>
      <label className="flex items-start gap-2">
        <Checkbox name="terms" />
        <span className="text-muted-foreground text-xs">
          I understand this portal is restricted to authorized MOSAIQ
          administrators.
        </span>
      </label>
      <SubmitButton isPending={state === "pending"} label="Activate account" />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, setState] = useState<PreviewState>("default");
  if (state === "submitted")
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">
          Submitted-state preview. If an eligible account exists, reset
          instructions would be sent. No email was sent.
        </AuthAlert>
        <Button
          className="w-full"
          onClick={() => setState("default")}
          variant="outline"
        >
          Return to form
        </Button>
      </div>
    );
  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setState("submitted");
      }}
    >
      <PreviewSelector
        state={state}
        setState={setState}
        options={[
          { label: "Default", value: "default" },
          { label: "Field error", value: "field-error" },
          { label: "Sending", value: "pending" },
          { label: "Submitted", value: "submitted" },
          { label: "Service unavailable", value: "unavailable" },
        ]}
      />
      {state === "unavailable" && (
        <AuthAlert tone="danger">
          Password recovery is unavailable in this UI preview. No email was
          sent.
        </AuthAlert>
      )}
      <FormField
        error={
          state === "field-error"
            ? "Enter a valid work email address."
            : undefined
        }
        id="forgot-email"
        label="Work email"
        required
      >
        <Input
          aria-invalid={state === "field-error"}
          autoComplete="email"
          id="forgot-email"
          name="email"
          type="email"
        />
      </FormField>
      <SubmitButton
        isPending={state === "pending"}
        label="Request reset link"
      />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, setState] = useState<PreviewState>("default");
  if (state === "expired")
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
  if (state === "success")
    return (
      <div className="space-y-5">
        <AuthAlert tone="success">
          Password-reset success presentation. No password was changed.
        </AuthAlert>
        <Button asChild className="w-full">
          <Link href={routes.login}>Return to sign in</Link>
        </Button>
      </div>
    );
  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setState("success");
      }}
    >
      <PreviewSelector
        state={state}
        setState={setState}
        options={[
          { label: "Default", value: "default" },
          { label: "Field error", value: "field-error" },
          { label: "Updating", value: "pending" },
          { label: "Expired link", value: "expired" },
          { label: "Service unavailable", value: "unavailable" },
          { label: "Success", value: "success" },
        ]}
      />
      {state === "unavailable" && (
        <AuthAlert tone="danger">
          Password reset is unavailable in this UI preview. No password was
          changed.
        </AuthAlert>
      )}
      <FormField
        description="The final password policy requires API agreement."
        id="reset-password"
        label="New password"
        required
      >
        <PasswordInput
          autoComplete="new-password"
          id="reset-password"
          name="password"
        />
      </FormField>
      <FormField
        error={state === "field-error" ? "Passwords must match." : undefined}
        id="reset-confirm"
        label="Confirm new password"
        required
      >
        <PasswordInput
          aria-invalid={state === "field-error"}
          autoComplete="new-password"
          id="reset-confirm"
          name="confirmPassword"
        />
      </FormField>
      <SubmitButton isPending={state === "pending"} label="Update password" />
    </form>
  );
}
