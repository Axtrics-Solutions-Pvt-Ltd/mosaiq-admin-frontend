"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes, userEditUrl } from "@/config/routes";
import { formatDate } from "@/lib/formatters";

import type { AgencyUser } from "./contracts";
import { useAgencyUser } from "./queries";

const roleLabels: Record<AgencyUser["role_code"], string> = {
  AGENCY_ADMIN: "Agency Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  CLIENT_USER: "Client User",
};

function DetailList({
  entries,
}: {
  entries: { label: string; value: string }[];
}) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {entries.map((entry) => (
        <div key={entry.label}>
          <dt className="text-muted-foreground text-xs font-medium">
            {entry.label}
          </dt>
          <dd className="text-strong mt-1 font-medium break-words">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function UserDetail({
  agencyId,
  userId,
}: {
  agencyId: number;
  userId: number;
}) {
  const userQuery = useAgencyUser(agencyId, userId);

  if (!agencyId) {
    return (
      <StatePanel
        description="Reopen this user from the users directory so its agency is known."
        kind="empty"
        title="Choose an agency"
      />
    );
  }

  if (userQuery.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading user" className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (userQuery.isError) {
    return (
      <StatePanel
        action={<Button onClick={() => userQuery.refetch()}>Try again</Button>}
        description="This user could not be loaded. Please try again."
        kind="error"
        title="User unavailable"
      />
    );
  }

  const user = userQuery.data;
  const canEdit = user.status !== "invited";

  return (
    <PageStack>
      <PageHeader
        actions={
          canEdit ? (
            <Button asChild>
              <Link href={userEditUrl(user.id, agencyId)}>
                <Pencil aria-hidden className="size-4" /> Edit user
              </Link>
            </Button>
          ) : undefined
        }
        breadcrumbs={
          <Link className="hover:text-primary" href={routes.users.index}>
            Users
          </Link>
        }
        description={user.email}
        title={user.name}
      />
      {!canEdit && (
        <p className="bg-muted text-muted-foreground rounded-lg border p-3 text-sm">
          This user has not accepted their invitation yet. Editing becomes
          available after they sign in and accept.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>User overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={user.status} />
          </div>
          <DetailList
            entries={[
              { label: "Role", value: roleLabels[user.role_code] },
              {
                label: "Client",
                value: user.client_id
                  ? `Client #${user.client_id}`
                  : "Agency access",
              },
              {
                label: "Workspaces",
                value: user.workspace_ids.length
                  ? user.workspace_ids.map((id) => `#${id}`).join(", ")
                  : "None",
              },
              {
                label: "Invited",
                value: user.invited_at ? formatDate(user.invited_at) : "--",
              },
              {
                label: "Accepted",
                value: user.accepted_at ? formatDate(user.accepted_at) : "--",
              },
            ]}
          />
        </CardContent>
      </Card>
    </PageStack>
  );
}
