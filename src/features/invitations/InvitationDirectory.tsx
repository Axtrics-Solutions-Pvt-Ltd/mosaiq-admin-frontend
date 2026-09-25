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
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/config/routes";
import { useAgencies } from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
import { useAgencyWorkspaces } from "@/features/workspaces/queries";
import { formatDate } from "@/lib/formatters";
import { useScope } from "@/providers/ScopeProvider";

import {
  getInvitationStatus,
  type Invitation,
  type InvitationStatusFilter,
} from "./contracts";
import { invitationRoleLabels as roleLabels } from "./labels";
import { useInvitations } from "./queries";
import { ResendInvitationButton } from "./ResendInvitationButton";
import { RevokeInvitationButton } from "./RevokeInvitationButton";

const statusFilterOptions: readonly {
  label: string;
  value: InvitationStatusFilter;
}[] = [
  { label: "Open (pending and expired)", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Expired", value: "expired" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Revoked", value: "revoked" },
  { label: "All invitations", value: "all" },
];

function InvitationActions({ invitation }: { invitation: Invitation }) {
  const canRevoke = getInvitationStatus(invitation) === "pending";
  const canResend = invitation.can_resend === true;
  if (!canRevoke && !canResend)
    return <span className="text-muted-foreground text-sm">No action</span>;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {canResend && (
        <ResendInvitationButton
          agencyId={invitation.agency_id}
          email={invitation.email}
          invitationId={invitation.id}
        />
      )}
      {canRevoke && (
        <RevokeInvitationButton
          agencyId={invitation.agency_id}
          invitationId={invitation.id}
        />
      )}
    </div>
  );
}

function Scope({ invitation }: { invitation: Invitation }) {
  if (invitation.client_id) {
    return (
      <span>
        <span className="text-strong block font-medium">
          Client #{invitation.client_id}
        </span>
        <span className="text-muted-foreground block text-xs">
          {invitation.workspace_name ?? "No workspace assigned"}
        </span>
      </span>
    );
  }
  if (invitation.workspace_name) {
    return <span>{invitation.workspace_name}</span>;
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
    header: "Workspace",
    id: "scope",
    render: (invitation) => <Scope invitation={invitation} />,
  },
  {
    header: "Status",
    id: "status",
    render: (invitation) => (
      <StatusBadge status={getInvitationStatus(invitation)} />
    ),
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
    render: (invitation) => <InvitationActions invitation={invitation} />,
  },
];

function InvitationCard({ invitation }: { invitation: Invitation }) {
  const status = getInvitationStatus(invitation);
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
          <StatusBadge status={status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Workspace</dt>
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
          <InvitationActions invitation={invitation} />
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
  agencyId: agencyIdFromUrl,
  page,
  status,
  workspaceId: workspaceIdFromUrl,
}: {
  agencyId: number | undefined;
  page: number;
  status: InvitationStatusFilter;
  workspaceId: number | undefined;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const scope = useScope();
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  // The agency/workspace filters here are local to this page, not the
  // header's global scope: choosing an agency to review invitations for
  // must not change what "agency" the header is showing elsewhere.
  const [localAgencyId, setLocalAgencyId] = useState(agencyIdFromUrl);
  const [localWorkspaceId, setLocalWorkspaceId] = useState(workspaceIdFromUrl);
  const agencyId = isSuperAdmin ? localAgencyId : scope.agencyId;
  const agenciesQuery = useAgencies({ page: 1 }, { enabled: isSuperAdmin });
  const agencies = agenciesQuery.data?.data ?? [];
  const workspaceId = localWorkspaceId;
  const workspacesQuery = useAgencyWorkspaces(agencyId ?? 0, {
    status: "active",
    per_page: 100,
  });
  const workspaces = workspacesQuery.data?.data ?? [];
  const invitationsQuery = useInvitations(
    agencyId ?? 0,
    page,
    status,
    workspaceId,
  );
  const invitations = invitationsQuery.data?.data ?? [];

  function changeAgency(value: string) {
    const nextAgencyId = value ? Number(value) : undefined;
    setLocalAgencyId(nextAgencyId);
    setLocalWorkspaceId(undefined);
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("agency", value);
    else params.delete("agency");
    params.delete("workspace");
    params.delete("page");
    router.replace(
      `${routes.users.invitations}${params.size ? `?${params}` : ""}`,
    );
  }

  function changeWorkspace(value: string) {
    setLocalWorkspaceId(value ? Number(value) : undefined);
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("workspace", value);
    else params.delete("workspace");
    params.delete("page");
    router.replace(
      `${routes.users.invitations}${params.size ? `?${params}` : ""}`,
    );
  }

  function changeStatus(nextStatus: string) {
    const params = new URLSearchParams(window.location.search);
    if (nextStatus === "open") params.delete("status");
    else params.set("status", nextStatus);
    params.delete("page");
    router.replace(
      `${routes.users.invitations}${params.size ? `?${params}` : ""}`,
    );
  }

  function changePage(nextPage: number) {
    if (!agencyId) return;
    const params = new URLSearchParams(window.location.search);
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
        description="Review agency invitations, resend expired ones, track accepted and declined responses, and revoke access before it is accepted."
        title="Invitations"
      />
      <FilterBar
        className={
          isSuperAdmin ? "sm:grid sm:grid-cols-3" : "sm:grid sm:grid-cols-2"
        }
      >
        {isSuperAdmin && (
          <div>
            <Label htmlFor="invitation-agency">Agency</Label>
            <Select
              className="mt-1.5"
              id="invitation-agency"
              onChange={(event) => changeAgency(event.target.value)}
              value={agencyId ? String(agencyId) : ""}
            >
              <option value="">Select an agency</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.display_name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="invitation-workspace">Workspace</Label>
          <Select
            className="mt-1.5"
            disabled={!agencyId || workspacesQuery.isPending}
            id="invitation-workspace"
            onChange={(event) => changeWorkspace(event.target.value)}
            title={
              agencyId ? undefined : "Choose an agency to filter by workspace"
            }
            value={workspaceId ? String(workspaceId) : ""}
          >
            <option value="">All workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="invitation-status">Status</Label>
          <Select
            className="mt-1.5"
            id="invitation-status"
            onChange={(event) => changeStatus(event.target.value)}
            value={status}
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>
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
      {currentUser.isSuccess && isSuperAdmin && agenciesQuery.isError && (
        <StatePanel
          action={
            <Button onClick={() => agenciesQuery.refetch()}>Try again</Button>
          }
          description="The agency list could not be loaded."
          kind="error"
          title="Agencies unavailable"
        />
      )}
      {currentUser.isSuccess &&
        isSuperAdmin &&
        agenciesQuery.isSuccess &&
        !agencyId && (
          <StatePanel
            description="Choose an agency above to review its unaccepted invitations."
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
          description="Invitations could not be loaded. Please try again."
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
            description={
              status === "all"
                ? "New invitations will appear here once sent."
                : status === "open"
                  ? "No invitations are waiting for a response or ready to resend."
                  : `No invitations currently have the "${
                      statusFilterOptions.find(
                        (option) => option.value === status,
                      )?.label ?? status
                    }" status.`
            }
            kind="empty"
            title="No invitations found"
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
              {invitationsQuery.data.meta.total} invitations
            </p>
            <DataTable
              caption="Invitations"
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
