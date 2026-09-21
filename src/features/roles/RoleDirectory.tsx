"use client";

import { ShieldCheck } from "lucide-react";

import { CardGrid, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
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
          <CardGrid>
            {rolesQuery.data.map((role) => (
              <RoleCard key={role.code} role={role} />
            ))}
          </CardGrid>
        </>
      )}
    </PageStack>
  );
}
