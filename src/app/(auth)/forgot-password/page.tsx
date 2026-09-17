import Link from "next/link";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/AuthCard";
import { ForgotPasswordForm } from "@/features/auth/AuthForms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      description="Enter your work email to review the password recovery experience."
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
