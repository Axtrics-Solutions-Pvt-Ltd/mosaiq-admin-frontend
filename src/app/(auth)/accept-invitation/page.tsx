import { Suspense } from "react";

import { AuthCard } from "@/features/auth/AuthCard";
import { AcceptInvitationForm } from "@/features/invitations/AcceptInvitationForm";

export default function AcceptInvitationPage() {
  return (
    <AuthCard
      description="Complete your profile to activate the access your administrator granted."
      isPreview={false}
      title="Accept your invitation"
    >
      <Suspense
        fallback={
          <p className="text-muted-foreground">Checking invitation...</p>
        }
      >
        <AcceptInvitationForm />
      </Suspense>
    </AuthCard>
  );
}
