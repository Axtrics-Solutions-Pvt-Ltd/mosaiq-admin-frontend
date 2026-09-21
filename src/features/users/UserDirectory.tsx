"use client";

import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
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
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes, userDetailUrl } from "@/config/routes";
import {
  AgencyCombobox,
  type AgencyOption,
} from "@/features/agencies/AgencyCombobox";
import { useCurrentUser } from "@/features/auth/queries";
import { formatDate } from "@/lib/formatters";

import { type AgencyUser,agencyUserRoles } from "./contracts";
import { useAgencyUsers } from "./queries";

const roleLabels: Record<AgencyUser["role_code"], string> = {
  AGENCY_ADMIN: "Agency Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
  CLIENT_USER: "Client User",
};

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

function columnsFor(agencyId: number): readonly DataTableColumn<AgencyUser>[] {
  return [
    {
      header: "Name",
      id: "name",
      render: (user) => (
        <Link
          className="group flex flex-col"
          href={userDetailUrl(user.id, agencyId)}
        >
          <span className="text-strong group-hover:text-primary font-medium">
            {user.name}
          </span>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </Link>
      ),
    },
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
          <Link href={userDetailUrl(user.id, agencyId)}>View</Link>
        </Button>
      ),
    },
  ];
}

function UserCard({ agencyId, user }: { agencyId: number; user: AgencyUser }) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <Link className="min-w-0" href={userDetailUrl(user.id, agencyId)}>
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
            <Link href={userDetailUrl(user.id, agencyId)}>View</Link>
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
  requestedAgencyId,
  page,
  search,
  status,
  role,
}: {
  requestedAgencyId?: number;
  page: number;
  search: string;
  status: "all" | "invited" | "active" | "inactive";
  role: "all" | AgencyUser["role_code"];
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [selectedAgency, setSelectedAgency] = useState<AgencyOption>();
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  const agencyId = isSuperAdmin
    ? requestedAgencyId
    : currentUser.data?.membership?.agencyId;
  const usersQuery = useAgencyUsers(agencyId ?? 0, {
    search: search || undefined,
    status: status === "all" ? undefined : status,
    role: role === "all" ? undefined : role,
    page,
  });
  const users = usersQuery.data?.data ?? [];
  const hasFilters = search !== "" || status !== "all" || role !== "all";

  function updateParams(update: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(window.location.search);
    update(params);
    params.delete("page");
    router.replace(`${routes.users.index}${params.size ? `?${params}` : ""}`);
  }

  function selectAgency(agency: AgencyOption) {
    setSelectedAgency(agency);
    updateParams((params) => params.set("agency", String(agency.id)));
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

  function changePage(nextPage: number) {
    if (!agencyId) return;
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
              <Link href={routes.users.invitations}>Pending invitations</Link>
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
      <FilterBar className="lg:grid lg:grid-cols-[minmax(13rem,1.6fr)_minmax(13rem,1.4fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]">
        {isSuperAdmin && (
          <div>
            <Label htmlFor="user-agency">Agency</Label>
            <div className="mt-1.5">
              <AgencyCombobox
                canCreate={false}
                id="user-agency"
                onChange={selectAgency}
                value={selectedAgency}
              />
            </div>
          </div>
        )}
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
        <div>
          <Label htmlFor="user-role">Role</Label>
          <Select
            className="mt-1.5"
            id="user-role"
            onChange={(event) => changeRole(event.target.value)}
            value={role}
          >
            <option value="all">All roles</option>
            {agencyUserRoles.map((roleCode) => (
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
      {currentUser.isSuccess && isSuperAdmin && !agencyId && (
        <StatePanel
          description="Select an agency to review its users."
          kind="empty"
          title="Choose an agency"
        />
      )}
      {currentUser.isSuccess && agencyId && usersQuery.isPending && (
        <LoadingUsers />
      )}
      {currentUser.isSuccess && agencyId && usersQuery.isError && (
        <StatePanel
          action={
            <Button onClick={() => usersQuery.refetch()}>Try again</Button>
          }
          description="Users could not be loaded. Please try again."
          kind="error"
          title="Users unavailable"
        />
      )}
      {currentUser.isSuccess &&
        agencyId &&
        usersQuery.isSuccess &&
        users.length === 0 && (
          <StatePanel
            action={
              hasFilters ? (
                <Button
                  onClick={() =>
                    router.replace(
                      `${routes.users.index}${isSuperAdmin ? `?agency=${agencyId}` : ""}`,
                    )
                  }
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
                : "Invited and active users for this agency will appear here."
            }
            kind={hasFilters ? "no-results" : "empty"}
            title={hasFilters ? "No users match these filters" : "No users yet"}
          />
        )}
      {currentUser.isSuccess &&
        agencyId &&
        usersQuery.isSuccess &&
        users.length > 0 && (
          <>
            <p className="text-muted-foreground text-sm">
              Showing <strong className="text-strong">{users.length}</strong> of{" "}
              {usersQuery.data.meta.total} users
            </p>
            <DataTable
              caption="User directory"
              columns={columnsFor(agencyId)}
              getRowKey={(user) => String(user.id)}
              mobileCard={(user) => (
                <UserCard agencyId={agencyId} user={user} />
              )}
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
