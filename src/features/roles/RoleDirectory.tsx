"use client";

import { Check, ExternalLink, Minus, ShieldCheck, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { CardGrid, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { capabilitiesForRole } from "@/config/permissions";
import { portals } from "@/config/portals";
import { canAccessAdmin } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";

import type { Role } from "./contracts";
import { useRoles } from "./queries";

const permissionLabels: Record<string, string> = {
  agency_create: "Create agencies",
  agency_edit: "Edit agencies",
  client_create: "Create clients",
  workspace_edit: "Edit workspaces",
  user_manage: "Manage users",
  dashboard_view: "View dashboards",
};

function permissionLabel(permission: string) {
  return (
    permissionLabels[permission] ??
    permission.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

// Known permissions keep a stable column order; any new API permission is appended.
function permissionColumns(roles: readonly Role[]) {
  const known = Object.keys(permissionLabels);
  const extra = roles
    .flatMap((role) => role.permissions)
    .filter((permission) => !known.includes(permission));
  return [...known, ...new Set(extra)].filter((permission) =>
    roles.some((role) => role.permissions.includes(permission)),
  );
}

function roleColumns(roles: readonly Role[]): DataTableColumn<Role>[] {
  return [
    {
      id: "role",
      header: "Role",
      render: (role) => (
        <div>
          <p className="text-foreground font-medium whitespace-nowrap">
            {role.name}
          </p>
          <p className="text-muted-foreground text-xs">{role.code}</p>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      render: (role) => (
        <Badge tone={role.assignable ? "primary" : "neutral"}>
          {role.assignable ? "Assignable" : "System role"}
        </Badge>
      ),
    },
    ...permissionColumns(roles).map((permission): DataTableColumn<Role> => ({
      id: permission,
      align: "center",
      header: permissionLabel(permission),
      render: (role) =>
        role.permissions.includes(permission) ? (
          <>
            <Check aria-hidden className="text-primary mx-auto size-4" />
            <span className="sr-only">Granted</span>
          </>
        ) : (
          <>
            <Minus
              aria-hidden
              className="text-muted-foreground/60 mx-auto size-4"
            />
            <span className="sr-only">Not granted</span>
          </>
        ),
    })),
    {
      id: "upload-csv",
      header: "Upload CSV?",
      render: (role) => (
        <DataAccess
          allowed={capabilitiesForRole(role.code).includes("imports.create")}
          deniedLabel="No"
          role={role}
        />
      ),
    },
    {
      id: "import-history",
      header: "View import history?",
      render: (role) => (
        <DataAccess
          allowed={capabilitiesForRole(role.code).includes(
            "importHistory.view",
          )}
          deniedLabel="Hidden"
          role={role}
        />
      ),
    },
    {
      id: "portal",
      header: "Portal",
      render: (role) => <PortalLink role={role} />,
    },
  ];
}

// Import access is scoped by tier: platform-wide, the member's agency, or their assigned workspaces.
function dataScope(role: Role) {
  if (role.code === "SUPER_ADMIN") return "All agencies";
  if (role.code === "AGENCY_ADMIN") return "Own agency";
  return "Assigned workspaces";
}

function DataAccess({
  allowed,
  deniedLabel,
  role,
}: {
  allowed: boolean;
  deniedLabel: string;
  role: Role;
}) {
  if (!allowed) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 whitespace-nowrap">
        <X aria-hidden className="size-4" />
        {deniedLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Check aria-hidden className="text-primary size-4" />
      Yes
      <span className="text-muted-foreground">· {dataScope(role)}</span>
    </span>
  );
}

function PortalLink({ role }: { role: Role }) {
  // Client users sign in to the customer-facing portal; every other role uses admin.
  const portal = role.code === "CLIENT_USER" ? portals.user : portals.admin;
  return (
    <a
      className="text-primary inline-flex items-center gap-1 font-medium whitespace-nowrap hover:underline"
      href={portal.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {portal.label}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function RoleCard({ role }: { role: Role }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle>{role.name}</CardTitle>
        <Badge tone={role.assignable ? "primary" : "neutral"}>
          {role.assignable ? "Assignable" : "System role"}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {role.code}
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {role.permissions.map((permission) => (
            <li key={permission}>
              <Badge tone="neutral">{permissionLabel(permission)}</Badge>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted-foreground">Upload CSV?</dt>
            <dd>
              <DataAccess
                allowed={capabilitiesForRole(role.code).includes(
                  "imports.create",
                )}
                deniedLabel="No"
                role={role}
              />
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted-foreground">View import history?</dt>
            <dd>
              <DataAccess
                allowed={capabilitiesForRole(role.code).includes(
                  "importHistory.view",
                )}
                deniedLabel="Hidden"
                role={role}
              />
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm">
          <PortalLink role={role} />
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingRoles() {
  return (
    <div aria-busy="true" aria-label="Loading roles" className="space-y-3">
      <CardGrid>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-40 w-full" key={index} />
        ))}
      </CardGrid>
    </div>
  );
}

export function RoleDirectory() {
  const currentUser = useCurrentUser();
  const canView = currentUser.data ? canAccessAdmin(currentUser.data) : false;
  const rolesQuery = useRoles(currentUser.isSuccess && canView);

  return (
    <PageStack>
      <PageHeader
        description="Fixed agency roles and the permissions each one grants. Roles and their permissions are defined by the platform and cannot be edited here."
        title="Roles & permissions"
      />
      {currentUser.isPending && <LoadingRoles />}
      {currentUser.isError && (
        <StatePanel
          action={
            <Button onClick={() => currentUser.refetch()}>Try again</Button>
          }
          description="Your access could not be confirmed. Please try again."
          kind="error"
          title="Roles unavailable"
        />
      )}
      {currentUser.isSuccess && !canView && (
        <StatePanel
          description="You do not have permission to view roles and permissions."
          kind="permission"
          title="Roles unavailable"
        />
      )}
      {currentUser.isSuccess && canView && rolesQuery.isPending && (
        <LoadingRoles />
      )}
      {currentUser.isSuccess && canView && rolesQuery.isError && (
        <StatePanel
          action={
            rolesQuery.error instanceof ApiError &&
            rolesQuery.error.status === 403 ? undefined : (
              <Button onClick={() => rolesQuery.refetch()}>Try again</Button>
            )
          }
          description={
            rolesQuery.error instanceof ApiError &&
            rolesQuery.error.status === 403
              ? "You do not have permission to view roles and permissions."
              : "Roles could not be loaded. Please try again."
          }
          kind={
            rolesQuery.error instanceof ApiError &&
            rolesQuery.error.status === 403
              ? "permission"
              : "error"
          }
          title="Roles unavailable"
        />
      )}
      {currentUser.isSuccess && canView && rolesQuery.isSuccess && (
        <>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <ShieldCheck aria-hidden className="size-4" />
            {rolesQuery.data.length} fixed role
            {rolesQuery.data.length === 1 ? "" : "s"}
          </p>
          <DataTable
            caption="Roles and the permissions each one grants"
            columns={roleColumns(rolesQuery.data)}
            getRowKey={(role) => role.code}
            mobileCard={(role) => <RoleCard role={role} />}
            rows={rolesQuery.data}
          />
        </>
      )}
    </PageStack>
  );
}
