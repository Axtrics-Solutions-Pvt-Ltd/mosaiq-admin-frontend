"use client";

import { ExternalLink, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { FilterBar, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { routes } from "@/config/routes";
import {
  AgencyCombobox,
  type AgencyOption,
} from "@/features/agencies/AgencyCombobox";
import { useAgency } from "@/features/agencies/queries";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { clientPreviewUrl } from "@/features/curation/client-preview";
import {
  toUpdateWorkspaceCurationRequest,
  toWorkspaceCurationView,
} from "@/features/curation/remote-model";
import { useAgencyWorkspaces } from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";

import { useUpdateWorkspaceCuration, useWorkspaceCuration } from "./queries";
import {
  isWorkspaceCurationDirty,
  toggleKpiEnabled,
  toggleModuleEnabled,
  type WorkspaceCurationView,
} from "./view-model";

function replaceCurationUrl(
  router: ReturnType<typeof useRouter>,
  next: { agencyId?: number; workspaceId?: number },
) {
  const params = new URLSearchParams();
  if (next.agencyId) params.set("agency", String(next.agencyId));
  if (next.workspaceId) params.set("workspace", String(next.workspaceId));
  router.replace(routes.curation + (params.size ? `?${params}` : ""));
}

function ModuleCard({
  module,
  onToggleModule,
  onToggleKpi,
}: {
  module: WorkspaceCurationView["modules"][number];
  onToggleModule: (moduleId: number) => void;
  onToggleKpi: (moduleId: number, kpiId: number) => void;
}) {
  const moduleCheckboxId = `curation-module-${module.id}`;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{module.name}</CardTitle>
        <div className="flex items-center gap-3">
          <Badge tone={module.isEnabled ? "success" : "neutral"}>
            {module.isEnabled ? "Visible" : "Hidden"}
          </Badge>
          <label
            className="flex items-center gap-2 text-sm"
            htmlFor={moduleCheckboxId}
          >
            <Checkbox
              checked={module.isEnabled}
              id={moduleCheckboxId}
              onChange={() => onToggleModule(module.id)}
            />
            Enable module
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {module.kpis.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This module has no KPIs configured.
          </p>
        ) : (
          <ul className="divide-y">
            {module.kpis.map((kpi) => {
              const kpiCheckboxId = `curation-kpi-${module.id}-${kpi.id}`;
              return (
                <li
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  key={kpi.id}
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-strong block truncate font-medium">
                      {kpi.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {kpi.code}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={kpi.isEnabled ? "success" : "neutral"}>
                      {kpi.isEnabled ? "Visible" : "Hidden"}
                    </Badge>
                    <label
                      className="flex items-center gap-2 text-sm"
                      htmlFor={kpiCheckboxId}
                    >
                      <Checkbox
                        checked={kpi.isEnabled}
                        id={kpiCheckboxId}
                        onChange={() => onToggleKpi(module.id, kpi.id)}
                      />
                      <span className="sr-only">{`Show ${kpi.name} to clients`}</span>
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CurationBoard({
  canManage,
  workspaceId,
}: {
  canManage: boolean;
  workspaceId: number;
}) {
  const query = useWorkspaceCuration(workspaceId);
  const updateMutation = useUpdateWorkspaceCuration();
  const [draftOverride, setDraftOverride] = useState<WorkspaceCurationView>();
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const saved = query.data ? toWorkspaceCurationView(query.data) : undefined;
  const draft = draftOverride ?? saved;

  if (query.isPending)
    return (
      <p aria-busy="true" className="text-muted-foreground">
        Loading curation configuration...
      </p>
    );

  if (query.isError) {
    const isForbidden =
      query.error instanceof ApiError && query.error.status === 403;
    return (
      <StatePanel
        action={
          !isForbidden ? (
            <Button onClick={() => query.refetch()}>Try again</Button>
          ) : undefined
        }
        description={
          isForbidden
            ? "You do not have access to curate this workspace."
            : "The curation configuration could not be loaded."
        }
        kind={isForbidden ? "permission" : "error"}
        title={isForbidden ? "Access denied" : "Curation unavailable"}
      />
    );
  }

  if (!draft || !saved) return null;

  if (draft.modules.length === 0)
    return (
      <StatePanel
        description="This workspace has no modules configured yet."
        kind="empty"
        title="No modules"
      />
    );

  const isDirty = isWorkspaceCurationDirty(saved, draft);

  async function save() {
    if (!draft) return;
    try {
      await updateMutation.mutateAsync({
        workspaceId,
        payload: toUpdateWorkspaceCurationRequest(draft),
      });
      setDraftOverride(undefined);
      toast({
        title: "Configuration saved",
        description: "Module and KPI visibility updated for this workspace.",
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof ApiError
            ? error.message
            : "The configuration could not be saved.",
        tone: "error",
      });
    }
  }

  return (
    <PageStack>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={isDirty ? "warning" : "success"}>
            {isDirty ? "Draft" : "Saved"}
          </Badge>
          <span className="text-muted-foreground text-sm">
            {isDirty
              ? "Unsaved changes to module and KPI visibility."
              : "All changes are saved."}
          </span>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => setIsResetConfirming(true)}
              variant="outline"
            >
              <RotateCcw aria-hidden className="size-4" /> Reset
            </Button>
            <Button
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => void save()}
            >
              <Save aria-hidden className="size-4" />
              {updateMutation.isPending ? "Saving..." : "Save configuration"}
            </Button>
          </div>
        )}
      </div>
      {!canManage && (
        <p className="text-muted-foreground text-sm">
          You can review this configuration but do not have permission to change
          it.
        </p>
      )}
      <div className="space-y-4">
        {draft.modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            onToggleKpi={(moduleId, kpiId) => {
              if (!canManage) return;
              setDraftOverride(toggleKpiEnabled(draft, moduleId, kpiId));
            }}
            onToggleModule={(moduleId) => {
              if (!canManage) return;
              setDraftOverride(toggleModuleEnabled(draft, moduleId));
            }}
          />
        ))}
      </div>
      <ConfirmationDialog
        body="This discards unsaved module and KPI visibility changes and restores the last saved configuration."
        confirmLabel="Reset changes"
        description="Unsaved changes will be lost."
        isOpen={isResetConfirming}
        onCancel={() => setIsResetConfirming(false)}
        onConfirm={() => {
          setDraftOverride(undefined);
          setIsResetConfirming(false);
        }}
        title="Reset to saved configuration?"
      />
    </PageStack>
  );
}

export function WorkspaceCurationEditor({
  agencyId,
  workspaceId,
}: {
  agencyId: number;
  workspaceId: number;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const resolvedAgencyId = agencyId || user.data?.membership?.agencyId || 0;
  const agencyQuery = useAgency(resolvedAgencyId);
  const workspacesQuery = useAgencyWorkspaces(resolvedAgencyId, {
    status: "active",
    per_page: 100,
  });
  const workspaces = workspacesQuery.data?.data ?? [];
  const resolvedWorkspaceId =
    workspaceId && workspaces.some((workspace) => workspace.id === workspaceId)
      ? workspaceId
      : 0;
  const canManage = Boolean(
    user.data &&
    hasCapability(user.data, "curation.manage") &&
    (user.data.platformRoleCode === "SUPER_ADMIN" ||
      user.data.membership?.agencyId === resolvedAgencyId),
  );

  return (
    <PageStack>
      <PageHeader
        actions={
          <Tooltip content="Opens the client-facing portal in a new tab. Preview URL is a placeholder pending the confirmed contract.">
            <Button asChild disabled={!resolvedWorkspaceId} variant="outline">
              {resolvedWorkspaceId ? (
                <a
                  href={clientPreviewUrl(resolvedWorkspaceId)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden className="size-4" /> Client preview
                </a>
              ) : (
                <span>
                  <ExternalLink aria-hidden className="size-4" /> Client preview
                </span>
              )}
            </Button>
          </Tooltip>
        }
        description="Choose what each client workspace can see in its Reporting, Marketing Intelligence, and Media Mix Model modules."
        title="KPI & module curation"
      />
      <FilterBar>
        <div className="min-w-56 flex-1">
          <Label htmlFor="curation-agency">Agency</Label>
          <div className="mt-1.5">
            <AgencyCombobox
              canCreate={false}
              id="curation-agency"
              onChange={(option: AgencyOption) =>
                replaceCurationUrl(router, { agencyId: option.id })
              }
              value={
                resolvedAgencyId
                  ? {
                      id: resolvedAgencyId,
                      displayName: agencyQuery.data?.display_name ?? "...",
                      status: agencyQuery.data?.status ?? "active",
                    }
                  : undefined
              }
            />
          </div>
        </div>
        <div className="min-w-56 flex-1">
          <Label htmlFor="curation-workspace">Workspace</Label>
          <Select
            className="mt-1.5"
            disabled={!resolvedAgencyId || workspacesQuery.isPending}
            id="curation-workspace"
            onChange={(event) =>
              replaceCurationUrl(router, {
                agencyId: resolvedAgencyId,
                workspaceId: Number(event.target.value) || undefined,
              })
            }
            value={resolvedWorkspaceId || ""}
          >
            <option value="">Select a workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>
      {!resolvedAgencyId ? (
        <StatePanel
          description="Choose an agency to see its client workspaces."
          kind="empty"
          title="Select an agency"
        />
      ) : workspacesQuery.isError ? (
        <StatePanel
          action={
            <Button onClick={() => workspacesQuery.refetch()}>Try again</Button>
          }
          description="The workspace list could not be loaded."
          kind="error"
          title="Workspaces unavailable"
        />
      ) : !resolvedWorkspaceId ? (
        <StatePanel
          description="Choose a workspace to review or change its curated modules and KPIs."
          kind="empty"
          title="Select a workspace"
        />
      ) : (
        <CurationBoard
          canManage={canManage}
          key={resolvedWorkspaceId}
          workspaceId={resolvedWorkspaceId}
        />
      )}
    </PageStack>
  );
}
