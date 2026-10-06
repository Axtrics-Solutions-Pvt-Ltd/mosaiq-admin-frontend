"use client";

import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes, userEditUrl } from "@/config/routes";
import { roleLabels } from "@/features/users/role-labels";
import { formatDate } from "@/lib/formatters";

import type { WorkspaceUser } from "./contracts";
import { useWorkspaceUsers } from "./queries";

const accessLabels: Record<WorkspaceUser["access"], string> = {
  agency: "Every channel (Agency Admin)",
  all_workspaces: "All channels of this client",
  workspace: "This channel",
};

function roleLabel(roleCode: string) {
  return Object.hasOwn(roleLabels, roleCode)
    ? roleLabels[roleCode as keyof typeof roleLabels]
    : roleCode;
}

function sinceLabel(user: WorkspaceUser) {
  if (user.invitation_expires_at)
    return `Invite expires ${formatDate(user.invitation_expires_at)}`;
  return user.granted_at ? formatDate(user.granted_at) : "—";
}

function UserIdentity({ user }: { user: WorkspaceUser }) {
  return (
    <div>
      <p className="text-strong font-medium">{user.name ?? user.email}</p>
      {user.name && (
        <p className="text-muted-foreground text-xs">{user.email}</p>
      )}
    </div>
  );
}

export function WorkspaceTeamCard({
  agencyId,
  clientId,
  workspaceId,
}: {
  agencyId: number;
  clientId: number;
  workspaceId: number;
}) {
  const users = useWorkspaceUsers({ agencyId, clientId, workspaceId });
  const columns: readonly DataTableColumn<WorkspaceUser>[] = [
    {
      id: "user",
      header: "User",
      render: (user) => <UserIdentity user={user} />,
    },
    { id: "role", header: "Role", render: (user) => roleLabel(user.role_code) },
    {
      id: "access",
      header: "Access",
      render: (user) => accessLabels[user.access],
    },
    {
      id: "status",
      header: "Status",
      render: (user) => <StatusBadge status={user.status} />,
    },
    { id: "since", header: "Since", render: sinceLabel },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (user) =>
        user.user_id ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={userEditUrl(user.user_id, agencyId)}>
              Manage<span className="sr-only"> {user.name ?? user.email}</span>
            </Link>
          </Button>
        ) : null,
    },
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Team and access</CardTitle>
          <Button asChild variant="outline">
            <Link href={routes.users.invite}>Invite user</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Everyone who can open this channel. Change access from each
          user&apos;s profile.
        </p>
        {users.isPending ? (
          <div aria-busy="true" className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : users.isError ? (
          <StatePanel
            kind="error"
            title="Team unavailable"
            description="The channel users could not be loaded."
            action={
              <Button onClick={() => users.refetch()} variant="outline">
                Try again
              </Button>
            }
          />
        ) : users.data.length === 0 ? (
          <StatePanel
            kind="empty"
            title="No users yet"
            description="No one is assigned to this channel. Invite a Manager or give an existing user access."
          />
        ) : (
          <DataTable
            caption="Channel users"
            columns={columns}
            getRowKey={(user) => user.email}
            mobileCard={(user) => (
              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <UserIdentity user={user} />
                  <StatusBadge status={user.status} />
                </div>
                <p className="text-muted-foreground text-sm">
                  {roleLabel(user.role_code)} · {accessLabels[user.access]}
                </p>
                <p className="text-muted-foreground text-xs">
                  {sinceLabel(user)}
                </p>
                {user.user_id && (
                  <Link
                    className="text-primary text-sm font-medium hover:underline"
                    href={userEditUrl(user.user_id, agencyId)}
                  >
                    Manage access
                  </Link>
                )}
              </div>
            )}
            rows={users.data}
          />
        )}
      </CardContent>
    </Card>
  );
}
