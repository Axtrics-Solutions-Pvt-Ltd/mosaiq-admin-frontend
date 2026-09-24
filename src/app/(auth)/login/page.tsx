import Link from "next/link";

import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/AuthCard";
import { LoginForm } from "@/features/auth/AuthForms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  return (
    <AuthCard
      description="Sign in to manage agencies, workspaces, access, and operational data."
      footer={
        <span>
          Having trouble?{" "}
          <a
            className="text-primary font-medium hover:underline"
            href="mailto:support@mosaiq.com"
          >
            Contact support
          </a>{" "}
          &middot;{" "}
          <Link
            className="text-primary font-medium hover:underline"
            href={routes.forbidden}
          >
            Access denied
          </Link>
        </span>
      }
      title="Welcome back"
    >
      <LoginForm next={next} reason={reason} />
    </AuthCard>
  );
}
