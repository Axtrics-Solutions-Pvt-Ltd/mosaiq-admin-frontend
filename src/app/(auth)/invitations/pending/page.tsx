import { AuthCard } from "@/features/auth/AuthCard";
import { PendingInvitationsScreen } from "@/features/invitations/PendingInvitationsScreen";

export default function PendingInvitationsPage() {
  return (
    <AuthCard
      description="Accept an invitation to get access to your agency's channels."
      title="Your invitations"
    >
      <PendingInvitationsScreen />
    </AuthCard>
  );
}
