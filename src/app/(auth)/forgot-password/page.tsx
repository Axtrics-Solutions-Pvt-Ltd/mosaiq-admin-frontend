import Link from "next/link";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/AuthCard";
import { ForgotPasswordForm } from "@/features/auth/PasswordRecoveryForms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      description="Enter your work email and we'll send a reset link if your account is eligible."
      isPreview={false}
      footer={
        <Link
          className="text-primary font-medium hover:underline"
          href={routes.login}
        >
          Back to sign in
        </Link>
      }
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
