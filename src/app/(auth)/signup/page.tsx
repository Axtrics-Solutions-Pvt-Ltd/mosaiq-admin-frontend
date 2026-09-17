import Link from "next/link";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/AuthCard";
import { SignupForm } from "@/features/auth/AuthForms";

export default function SignupPage() {
  return (
    <AuthCard
      description="Complete your profile using the invitation issued by your MOSAIQ administrator."
      eyebrow="Invite-only access"
      footer={
        <span>
          Already activated?{" "}
          <Link
            className="text-primary font-medium hover:underline"
            href={routes.login}
          >
            Sign in
          </Link>
        </span>
      }
      title="Activate your admin account"
    >
      <SignupForm />
    </AuthCard>
  );
}
