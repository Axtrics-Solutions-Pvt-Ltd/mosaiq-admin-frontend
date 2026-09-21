import Link from "next/link";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/AuthCard";
import { ResetPasswordForm } from "@/features/auth/PasswordRecoveryForms";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      description="Choose a new password for your administrator account."
      isPreview={false}
      footer={
        <Link
          className="text-primary font-medium hover:underline"
          href={routes.login}
        >
          Back to sign in
        </Link>
      }
      title="Set a new password"
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
