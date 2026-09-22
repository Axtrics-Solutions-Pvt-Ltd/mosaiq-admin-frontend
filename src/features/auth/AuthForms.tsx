"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { routes } from "@/config/routes";
import { AuthAlert } from "@/features/auth/AuthAlert";
import { canSignIntoAdmin } from "@/features/auth/contracts";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { useLogin } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";

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
        Access is invite-only. Use the activation link sent to your email, or
        contact your administrator.
      </p>
    </form>
  );
}
