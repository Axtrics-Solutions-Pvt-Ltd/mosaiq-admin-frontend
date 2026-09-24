import { AuthCard } from "@/features/auth/AuthCard";
import { PendingInvitationsScreen } from "@/features/invitations/PendingInvitationsScreen";

export default function PendingInvitationsPage() {
  return (
    <AuthCard
      description="Accept an invitation to get access to your agency's workspaces."
      isPreview={false}
      title="Your invitations"
    >
      <PendingInvitationsScreen />
    </AuthCard>
  );
}
