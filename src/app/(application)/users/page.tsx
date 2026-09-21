import { UserPlus } from "lucide-react";
import Link from "next/link";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { routes } from "@/config/routes";

export default function UsersPage() {
  return (
    <PageStack>
      <PageHeader
        actions={
          <Button asChild>
            <Link href={routes.users.invite}>
              <UserPlus aria-hidden className="size-4" /> Invite user
            </Link>
          </Button>
        }
        description="Invite people to an agency and assign their initial access."
        title="Users"
      />
      <StatePanel
        kind="unavailable"
        title="Invitation list unavailable"
        description="The backend does not yet provide an invitation list or resend endpoint. You can send an invitation now; revocation can be shown when an invitation ID is available."
      />
    </PageStack>
  );
}
