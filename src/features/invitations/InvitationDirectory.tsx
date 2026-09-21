"use client";

import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/config/routes";
import {
  AgencyCombobox,
  type AgencyOption,
} from "@/features/agencies/AgencyCombobox";
import { useAgency } from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
import { formatDate } from "@/lib/formatters";

import type { Invitation } from "./contracts";
import { usePendingInvitations } from "./queries";
import { RevokeInvitationButton } from "./RevokeInvitationButton";

const roleLabels: Record<Invitation["role_code"], string> = {
  AGENCY_ADMIN: "Agency Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  CLIENT_USER: "Client User",
};

function Scope({ invitation }: { invitation: Invitation }) {
  if (invitation.client_id) {
    return (
      <span>
        <span className="text-strong block font-medium">
          Client #{invitation.client_id}
        </span>
        <span className="text-muted-foreground block text-xs">
          {invitation.workspace_ids.length} workspace
          {invitation.workspace_ids.length === 1 ? "" : "s"}
        </span>
      </span>
    );
  }
  return <span className="text-muted-foreground">Agency access</span>;
}

const columns: readonly DataTableColumn<Invitation>[] = [
  {
    header: "Email",
    id: "email",
    render: (invitation) => (
      <span className="text-strong font-medium">{invitation.email}</span>
    ),
  },
  {
    header: "Role",
    id: "role",
    render: (invitation) => roleLabels[invitation.role_code],
  },
  {
    header: "Access scope",
    id: "scope",
    render: (invitation) => <Scope invitation={invitation} />,
  },
  {
    header: "Status",
    id: "status",
    render: () => <StatusBadge status="pending" />,
  },
  {
    header: "Expires",
    id: "expires",
    render: (invitation) => (
      <time dateTime={invitation.expires_at}>
        {formatDate(invitation.expires_at)}
      </time>
    ),
  },
  {
    header: <span className="sr-only">Actions</span>,
    id: "actions",
    render: (invitation) => (
      <RevokeInvitationButton
        agencyId={invitation.agency_id}
        invitationId={invitation.id}
      />
    ),
  },
];

function InvitationCard({ invitation }: { invitation: Invitation }) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-strong truncate font-medium">
              {invitation.email}
            </p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {roleLabels[invitation.role_code]}
            </p>
          </div>
          <StatusBadge status="pending" />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Access scope</dt>
            <dd className="mt-1">
              <Scope invitation={invitation} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Expires</dt>
            <dd className="text-strong mt-1">
              <time dateTime={invitation.expires_at}>
                {formatDate(invitation.expires_at)}
              </time>
            </dd>
          </div>
        </dl>
        <div className="mt-4 border-t pt-4">
          <RevokeInvitationButton
            agencyId={invitation.agency_id}
            invitationId={invitation.id}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingInvitations() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading pending invitations"
      className="space-y-3"
    >
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton className="h-16 w-full" key={index} />
      ))}
    </div>
  );
}

export function InvitationDirectory({
  requestedAgencyId,
  page,
}: {
  requestedAgencyId?: number;
  page: number;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [selectedAgency, setSelectedAgency] = useState<AgencyOption>();
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  const agencyId = isSuperAdmin
    ? requestedAgencyId
    : currentUser.data?.membership?.agencyId;
  const agencyQuery = useAgency(isSuperAdmin ? (requestedAgencyId ?? 0) : 0);
  const hydratedAgency = agencyQuery.data
    ? {
        id: agencyQuery.data.id,
        displayName: agencyQuery.data.display_name,
        status: agencyQuery.data.status,
      }
    : undefined;
  const invitationsQuery = usePendingInvitations(agencyId ?? 0, page);
  const invitations = invitationsQuery.data?.data ?? [];

  function selectAgency(agency: AgencyOption) {
    setSelectedAgency(agency);
    router.replace(`${routes.users.invitations}?agency=${agency.id}`);
  }

  function changePage(nextPage: number) {
    if (!agencyId) return;
    const params = new URLSearchParams();
    if (isSuperAdmin) params.set("agency", String(agencyId));
    params.set("page", String(nextPage));
    router.replace(`${routes.users.invitations}?${params}`);
  }

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
        breadcrumbs={
          <Link className="hover:text-primary" href={routes.users.index}>
            Users
          </Link>
        }
        description="Review pending agency invitations and revoke access before it is accepted."
        title="Pending invitations"
      />
      {isSuperAdmin && (
        <FilterBar>
          <div className="w-full max-w-lg">
            <Label htmlFor="invitation-agency">Agency</Label>
            <div className="mt-1.5">
              <AgencyCombobox
                canCreate={false}
                id="invitation-agency"
                onChange={selectAgency}
                value={
                  selectedAgency?.id === requestedAgencyId
                    ? selectedAgency
                    : hydratedAgency
                }
              />
            </div>
          </div>
        </FilterBar>
      )}
      {currentUser.isPending && <LoadingInvitations />}
      {currentUser.isError && (
        <StatePanel
          action={
            <Button onClick={() => currentUser.refetch()}>Try again</Button>
          }
          description="Your access could not be confirmed. Please try again."
          kind="error"
          title="Users unavailable"
        />
      )}
      {currentUser.isSuccess && isSuperAdmin && !agencyId && (
        <StatePanel
          description="Select an agency to review its unaccepted invitations."
          kind="empty"
          title="Choose an agency"
        />
      )}
      {currentUser.isSuccess && agencyId && invitationsQuery.isPending && (
        <LoadingInvitations />
      )}
      {currentUser.isSuccess && agencyId && invitationsQuery.isError && (
        <StatePanel
          action={
            <Button onClick={() => invitationsQuery.refetch()}>
              Try again
            </Button>
          }
          description="Pending invitations could not be loaded. Please try again."
          kind="error"
          title="Invitations unavailable"
        />
      )}
      {currentUser.isSuccess &&
        agencyId &&
        invitationsQuery.isSuccess &&
        invitations.length === 0 && (
          <StatePanel
            action={
              <Button asChild>
                <Link href={routes.users.invite}>Invite a user</Link>
              </Button>
            }
            description="New invitations will appear here until they are accepted, revoked, or expire."
            kind="empty"
            title="No pending invitations"
          />
        )}
      {currentUser.isSuccess &&
        agencyId &&
        invitationsQuery.isSuccess &&
        invitations.length > 0 && (
          <>
            <p className="text-muted-foreground text-sm">
              Showing{" "}
              <strong className="text-strong">{invitations.length}</strong> of{" "}
              {invitationsQuery.data.meta.total} pending invitations
            </p>
            <DataTable
              caption="Pending invitations"
              columns={columns}
              getRowKey={(invitation) => String(invitation.id)}
              mobileCard={(invitation) => (
                <InvitationCard invitation={invitation} />
              )}
              rows={invitations}
            />
            <nav
              aria-label="Invitation pagination"
              className="bg-card flex items-center justify-between rounded-lg border p-3"
            >
              <p className="text-muted-foreground text-sm">
                Page {invitationsQuery.data.meta.current_page} of{" "}
                {invitationsQuery.data.meta.last_page}
              </p>
              <div className="flex gap-2">
                <Button
                  aria-label="Previous invitation page"
                  disabled={invitationsQuery.data.meta.current_page <= 1}
                  onClick={() =>
                    changePage(invitationsQuery.data.meta.current_page - 1)
                  }
                  size="icon"
                  variant="outline"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </Button>
                <Button
                  aria-label="Next invitation page"
                  disabled={
                    invitationsQuery.data.meta.current_page >=
                    invitationsQuery.data.meta.last_page
                  }
                  onClick={() =>
                    changePage(invitationsQuery.data.meta.current_page + 1)
                  }
                  size="icon"
                  variant="outline"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </Button>
              </div>
            </nav>
          </>
        )}
    </PageStack>
  );
}
