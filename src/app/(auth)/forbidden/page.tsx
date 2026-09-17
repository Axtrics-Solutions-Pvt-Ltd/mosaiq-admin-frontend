import { LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { routes } from "@/config/routes";
import { AuthCard } from "@/features/auth/AuthCard";

export default function ForbiddenPage() {
  return (
    <AuthCard
      description="Your current account does not have permission to view this area."
      eyebrow="Access restricted"
      title="You cannot access this page"
    >
      <div className="text-center">
        <span className="bg-destructive-soft text-destructive mx-auto grid size-12 place-items-center rounded-full">
          <LockKeyhole aria-hidden className="size-5" />
        </span>
        <p className="text-muted-foreground mt-4 text-sm">
          Ask a platform administrator to review your role for access.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href={routes.login}>Return to sign in</Link>
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}
