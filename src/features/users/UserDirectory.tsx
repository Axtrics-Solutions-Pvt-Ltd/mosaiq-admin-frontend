"use client";

import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  type AssignableAgencyRole,
  assignableAgencyRoles,
} from "@/config/permissions";
import { routes, userDetailUrl } from "@/config/routes";
import { useAgencies } from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
import { useAgencyWorkspaces } from "@/features/workspaces/queries";
import { formatDate } from "@/lib/formatters";
import { useScope } from "@/providers/ScopeProvider";

import type { AgencyUser } from "./contracts";
import { useAgencyUsers } from "./queries";
import { roleLabels } from "./role-labels";

function Scope({ user }: { user: AgencyUser }) {
  if (user.client_id) {
    return (
      <span>
        <span className="text-strong block font-medium">
          Client #{user.client_id}
        </span>
        <span className="text-muted-foreground block text-xs">
          {user.workspace_ids.length} workspace
          {user.workspace_ids.length === 1 ? "" : "s"}
        </span>
      </span>
    );
  }
  return <span className="text-muted-foreground">Agency access</span>;
}

function buildColumns(
  isAllAgencies: boolean,
  agencyName: (id: number) => string,
): readonly DataTableColumn<AgencyUser>[] {
  return [
    {
      header: "Name",
      id: "name",
      render: (user) => (
        <Link
          className="group flex flex-col"
          href={userDetailUrl(user.id, user.agency_id)}
        >
          <span className="text-strong group-hover:text-primary font-medium">
            {user.name}
          </span>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </Link>
      ),
    },
    ...(isAllAgencies
      ? [
          {
            header: "Agency",
            id: "agency",
            render: (user: AgencyUser) => agencyName(user.agency_id),
          } satisfies DataTableColumn<AgencyUser>,
        ]
      : []),
    {
      header: "Role",
      id: "role",
      render: (user) => roleLabels[user.role_code],
    },
    {
      header: "Access scope",
      id: "scope",
      render: (user) => <Scope user={user} />,
    },
    {
      header: "Status",
      id: "status",
      render: (user) => <StatusBadge status={user.status} />,
    },
    {
      header: "Invited",
      id: "invited",
      render: (user) =>
        user.invited_at ? (
          <time dateTime={user.invited_at}>{formatDate(user.invited_at)}</time>
        ) : (
          "--"
        ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      id: "actions",
      render: (user) => (
        <Button asChild size="sm" variant="outline">
          <Link href={userDetailUrl(user.id, user.agency_id)}>View</Link>
        </Button>
      ),
    },
  ];
}

function UserCard({ user }: { user: AgencyUser }) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            className="min-w-0"
            href={userDetailUrl(user.id, user.agency_id)}
          >
            <p className="text-strong truncate font-medium">{user.name}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {user.email}
            </p>
          </Link>
          <StatusBadge status={user.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Role</dt>
            <dd className="text-strong mt-1">{roleLabels[user.role_code]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Access scope</dt>
            <dd className="mt-1">
              <Scope user={user} />
            </dd>
          </div>
        </dl>
        <div className="mt-4 border-t pt-4">
          <Button asChild size="sm" variant="outline">
            <Link href={userDetailUrl(user.id, user.agency_id)}>View</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingUsers() {
  return (
    <div aria-busy="true" aria-label="Loading users" className="space-y-3">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton className="h-16 w-full" key={index} />
      ))}
    </div>
  );
}

export function UserDirectory({
  page,
  search,
  status,
  role,
}: {
  page: number;
  search: string;
  status: "all" | "invited" | "active" | "inactive";
  role: "all" | AssignableAgencyRole;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const scope = useScope();
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  const agencyId = scope.agencyId;
  const agenciesQuery = useAgencies({ page: 1 }, { enabled: isSuperAdmin });
  const agencies = agenciesQuery.data?.data ?? [];
  const agencyNameById = new Map(
    agencies.map((agency) => [agency.id, agency.display_name]),
  );
  const agencyName = (id: number) => agencyNameById.get(id) ?? `Agency #${id}`;
  const workspaceId = scope.workspaceId;
  const workspacesQuery = useAgencyWorkspaces(agencyId ?? 0, {
    status: "active",
    per_page: 100,
  });
  const workspaces = workspacesQuery.data?.data ?? [];
  const usersQuery = useAgencyUsers(agencyId, {
    search: search || undefined,
    status: status === "all" ? undefined : status,
    role: role === "all" ? undefined : role,
    workspace_id: workspaceId,
    page,
  });
  const users = usersQuery.data?.data ?? [];
  const hasFilters = search !== "" || status !== "all" || role !== "all";
  const columns = buildColumns(!agencyId, agencyName);

  function updateParams(update: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(window.location.search);
    update(params);
    params.delete("page");
    router.replace(`${routes.users.index}${params.size ? `?${params}` : ""}`);
  }

  function changeSearch(value: string) {
    updateParams((params) => {
      if (value) params.set("search", value);
      else params.delete("search");
    });
  }

  function changeStatus(value: string) {
    updateParams((params) => {
      if (value === "all") params.delete("status");
      else params.set("status", value);
    });
  }

  function changeRole(value: string) {
    updateParams((params) => {
      if (value === "all") params.delete("role");
      else params.set("role", value);
    });
  }

  function changeAgency(value: string) {
    scope.setAgencyId(value ? Number(value) : undefined);
    updateParams(() => {});
  }

  function changeWorkspace(value: string) {
    scope.setWorkspaceId(value ? Number(value) : undefined);
    updateParams(() => {});
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(nextPage));
    router.replace(`${routes.users.index}?${params}`);
  }

  return (
    <PageStack>
      <PageHeader
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={routes.users.invitations}>Invitations</Link>
            </Button>
            <Button asChild>
              <Link href={routes.users.invite}>
                <UserPlus aria-hidden className="size-4" /> Invite user
              </Link>
            </Button>
          </>
        }
        description="Review agency users, their access, and invitation status."
        title="Users"
      />
      <FilterBar
        className={
          isSuperAdmin
            ? "lg:grid lg:grid-cols-[minmax(13rem,1.6fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]"
            : "lg:grid lg:grid-cols-[minmax(13rem,1.6fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]"
        }
      >
        <div>
          <Label htmlFor="user-search">Search users</Label>
          <div className="relative mt-1.5">
            <Search
              aria-hidden
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              className="pl-9"
              id="user-search"
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Name or email"
              value={search}
            />
          </div>
        </div>
        {isSuperAdmin && (
          <div>
            <Label htmlFor="user-agency">Agency</Label>
            <Select
              className="mt-1.5"
              id="user-agency"
              onChange={(event) => changeAgency(event.target.value)}
              value={agencyId ? String(agencyId) : ""}
            >
              <option value="">All agencies</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.display_name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="user-workspace">Workspace</Label>
          <Select
            className="mt-1.5"
            disabled={!agencyId || workspacesQuery.isPending}
            id="user-workspace"
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
          <Label htmlFor="user-role">Role</Label>
          <Select
            className="mt-1.5"
            id="user-role"
            onChange={(event) => changeRole(event.target.value)}
            value={role}
          >
            <option value="all">All roles</option>
            {assignableAgencyRoles.map((roleCode) => (
              <option key={roleCode} value={roleCode}>
                {roleLabels[roleCode]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="user-status">Status</Label>
          <Select
            className="mt-1.5"
            id="user-status"
            onChange={(event) => changeStatus(event.target.value)}
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="invited">Invited</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </FilterBar>
      {currentUser.isPending && <LoadingUsers />}
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
      {currentUser.isSuccess && usersQuery.isPending && <LoadingUsers />}
      {currentUser.isSuccess && usersQuery.isError && (
        <StatePanel
          action={
            <Button onClick={() => usersQuery.refetch()}>Try again</Button>
          }
          description="Users could not be loaded. Please try again."
          kind="error"
          title="Users unavailable"
        />
      )}
      {currentUser.isSuccess && usersQuery.isSuccess && users.length === 0 && (
        <StatePanel
          action={
            hasFilters ? (
              <Button
                onClick={() => router.replace(routes.users.index)}
                variant="outline"
              >
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link href={routes.users.invite}>Invite a user</Link>
              </Button>
            )
          }
          description={
            hasFilters
              ? "Try another name or remove a filter."
              : agencyId
                ? "Invited and active users for this agency will appear here."
                : "Invited and active users across all agencies will appear here."
          }
          kind={hasFilters ? "no-results" : "empty"}
          title={hasFilters ? "No users match these filters" : "No users yet"}
        />
      )}
      {currentUser.isSuccess && usersQuery.isSuccess && users.length > 0 && (
        <>
          <p className="text-muted-foreground text-sm">
            Showing <strong className="text-strong">{users.length}</strong> of{" "}
            {usersQuery.data.meta.total} users
          </p>
          <DataTable
            caption="User directory"
            columns={columns}
            getRowKey={(user) => String(user.id)}
            mobileCard={(user) => <UserCard user={user} />}
            rows={users}
          />
          <nav
            aria-label="User pagination"
            className="bg-card flex items-center justify-between rounded-lg border p-3"
          >
            <p className="text-muted-foreground text-sm">
              Page {usersQuery.data.meta.current_page} of{" "}
              {usersQuery.data.meta.last_page}
            </p>
            <div className="flex gap-2">
              <Button
                aria-label="Previous user page"
                disabled={usersQuery.data.meta.current_page <= 1}
                onClick={() =>
                  changePage(usersQuery.data.meta.current_page - 1)
                }
                size="icon"
                variant="outline"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </Button>
              <Button
                aria-label="Next user page"
                disabled={
                  usersQuery.data.meta.current_page >=
                  usersQuery.data.meta.last_page
                }
                onClick={() =>
                  changePage(usersQuery.data.meta.current_page + 1)
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
