"use client";

import { Activity, Pencil, Power, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { type TabOption, Tabs } from "@/components/ui/Tabs";
import { toast } from "@/components/ui/Toast";
import { clientDetailUrl, routes, workspaceEditUrl } from "@/config/routes";
import { useAgency } from "@/features/agencies/queries";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ChannelBadge } from "@/features/channels/ChannelBadge";
import { formatDate } from "@/lib/formatters";

import { ConnectionCard } from "./ConnectionCard";
import type { WorkspaceRecord } from "./contracts";
import {
  useClient,
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspace,
} from "./queries";

function Preview({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge tone="primary">UI preview</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}
function DetailList({
  values,
}: {
  values: { label: string; value: string }[];
}) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {values.map((entry) => (
        <div key={entry.label}>
          <dt className="text-muted-foreground text-xs">{entry.label}</dt>
          <dd className="text-strong mt-1 font-medium">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
function DeleteWorkspaceDialog({
  record,
  isOpen,
  onClose,
}: {
  record: WorkspaceRecord;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const mutation = useDeleteWorkspace();
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState("");
  function close() {
    setTypedName("");
    setError("");
    onClose();
  }
  async function confirm() {
    setError("");
    try {
      await mutation.mutateAsync({
        agencyId: record.agency_id,
        clientId: record.client_id,
        workspaceId: record.id,
      });
      toast({
        title: "Workspace deleted",
        description: `${record.name} was removed from reports and its access was revoked.`,
        tone: "success",
      });
      router.push(clientDetailUrl(record.client_id, record.agency_id));
    } catch {
      setError("The workspace could not be deleted. Please try again.");
    }
  }
  return (
    <ConfirmationDialog
      body={
        <div className="space-y-4">
          <p>
            {record.name} is removed from all reports, and everyone&apos;s
            access to it is revoked, including pending invitations. Its stored
            credentials are deleted. The channel data is kept for recovery.
          </p>
          <FormField
            id="delete-workspace-name"
            label={`Type ${record.name} to confirm`}
          >
            <Input
              autoComplete="off"
              id="delete-workspace-name"
              onChange={(event) => setTypedName(event.target.value)}
              value={typedName}
            />
          </FormField>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </div>
      }
      confirmLabel="Delete workspace"
      description="This removes the workspace for everyone."
      isConfirmDisabled={typedName !== record.name}
      isOpen={isOpen}
      isPending={mutation.isPending}
      onCancel={close}
      onConfirm={confirm}
      title={`Delete ${record.name}?`}
    />
  );
}
export function WorkspaceDetails({
  workspaceId,
  agencyId,
  clientId,
}: {
  workspaceId: number;
  agencyId: number;
  clientId: number;
}) {
  const workspace = useWorkspace(agencyId, clientId, workspaceId);
  const agency = useAgency(agencyId);
  const client = useClient(agencyId, clientId);
  const user = useCurrentUser();
  const mutation = useUpdateWorkspace();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  if (
    ![workspaceId, agencyId, clientId].every(
      (id) => Number.isSafeInteger(id) && id > 0,
    )
  )
    return (
      <StatePanel
        kind="error"
        title="Workspace scope required"
        description="Open this workspace from the directory so its agency and client are known."
        action={
          <Button asChild>
            <Link href={routes.workspaces.index}>Open workspaces</Link>
          </Button>
        }
      />
    );
  if (workspace.isPending) return <p aria-busy="true">Loading workspace...</p>;
  if (workspace.isError)
    return (
      <StatePanel
        kind="error"
        title="Workspace unavailable"
        description="The workspace could not be loaded."
        action={<Button onClick={() => workspace.refetch()}>Try again</Button>}
      />
    );
  const record = workspace.data;
  const canManage = Boolean(
    user.data && hasCapability(user.data, "workspaces.manage"),
  );
  const canDelete = Boolean(
    user.data && hasCapability(user.data, "workspaces.delete"),
  );
  const connectorId = record.connector_id;
  async function changeStatus() {
    setError("");
    // A legacy workspace must choose its channel (on Edit) before other saves.
    if (!connectorId) return;
    try {
      await mutation.mutateAsync({
        agencyId,
        clientId,
        workspaceId,
        payload: {
          connector_id: connectorId,
          name: record.name,
          timezone: record.timezone,
          currency: record.currency,
          status: record.status === "active" ? "inactive" : "active",
        },
      });
      setIsConfirming(false);
    } catch {
      setError("The workspace status could not be changed. Please try again.");
    }
  }
  const tabs: readonly TabOption[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Workspace overview</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                values={[
                  { label: "Workspace", value: record.name },
                  {
                    label: "Channel",
                    value: record.connector?.name ?? "Not assigned",
                  },
                  {
                    label: "Client",
                    value: client.data?.name ?? "Loading client",
                  },
                  {
                    label: "Agency",
                    value: agency.data?.display_name ?? "Loading agency",
                  },
                  { label: "Description", value: "Not available" },
                  { label: "Industry or category", value: "Not available" },
                  { label: "Primary client contact", value: "Not available" },
                  { label: "Account manager", value: "Not available" },
                  { label: "Currency", value: record.currency },
                  { label: "Time zone", value: record.timezone },
                  {
                    label: "Created",
                    value: record.created_at
                      ? formatDate(record.created_at)
                      : "Unknown",
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Account status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusBadge status={record.status} />
              <p className="text-muted-foreground text-sm">
                Workspace status is saved to the API.
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: "connection",
      label: "Connection",
      content: <ConnectionCard canManage={canManage} workspace={record} />,
    },
    {
      value: "market",
      label: "Market Profile",
      content: (
        <Preview
          title="Market profile"
          description="Country, provinces, target markets, languages, audience segments, and reporting period are not in the workspace API yet."
        >
          <DetailList
            values={[
              { label: "Default currency", value: record.currency },
              { label: "Time zone", value: record.timezone },
              { label: "Target markets", value: "Not available" },
              { label: "Target languages", value: "Not available" },
            ]}
          />
        </Preview>
      ),
    },
    {
      value: "modules",
      label: "Modules",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Module access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              KPI and module visibility for this workspace is managed on the
              Curation screen.
            </p>
            <Button asChild variant="outline">
              <Link
                href={`${routes.curation}?agency=${agencyId}&workspace=${workspaceId}`}
              >
                Open curation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "team",
      label: "Team and Access",
      content: (
        <Preview
          title="Team and access"
          description="Workspace assignments and roles are not returned by this API. Manage agency users in Users and access."
        >
          <div className="flex items-center gap-3">
            <UsersRound aria-hidden className="text-primary size-5" />
            <span className="text-muted-foreground">
              No assignment information available.
            </span>
          </div>
          <Button asChild variant="outline">
            <Link href={routes.users.index}>Open users</Link>
          </Button>
        </Preview>
      ),
    },
    {
      value: "activity",
      label: "Activity",
      content: (
        <Preview
          title="Recent activity"
          description="The workspace API has no activity feed yet."
        >
          <div className="flex items-center gap-3">
            <Activity aria-hidden className="text-primary size-5" />
            <span className="text-muted-foreground">
              No workspace events available.
            </span>
          </div>
        </Preview>
      ),
    },
  ];
  return (
    <PageStack>
      <PageHeader
        title={record.name}
        context={
          (agency.data?.display_name ?? "Agency") +
          " / " +
          (client.data?.name ?? "Client")
        }
        description="Workspace details and management."
        breadcrumbs={<Link href={routes.workspaces.index}>Workspaces</Link>}
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline">
                <Link href={workspaceEditUrl(workspaceId, agencyId, clientId)}>
                  <Pencil aria-hidden className="size-4" /> Edit
                </Link>
              </Button>
              {connectorId && (
                <Button variant="outline" onClick={() => setIsConfirming(true)}>
                  <Power aria-hidden className="size-4" />{" "}
                  {record.status === "active" ? "Deactivate" : "Activate"}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleting(true)}
                >
                  <Trash2 aria-hidden className="size-4" /> Delete workspace
                </Button>
              )}
            </>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={record.status} />
        <ChannelBadge channel={record.connector} />
        {record.connection && <StatusBadge status={record.connection.status} />}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="bg-card overflow-x-auto rounded-lg border p-4 sm:p-5">
        <Tabs items={tabs} />
      </div>
      <ConfirmationDialog
        isOpen={isConfirming}
        isPending={mutation.isPending}
        title={
          record.status === "active"
            ? "Deactivate workspace?"
            : "Activate workspace?"
        }
        description="This changes the workspace status in the API."
        body={<p>Confirm the status change for {record.name}.</p>}
        confirmLabel={record.status === "active" ? "Deactivate" : "Activate"}
        onCancel={() => setIsConfirming(false)}
        onConfirm={changeStatus}
      />
      <DeleteWorkspaceDialog
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        record={record}
      />
    </PageStack>
  );
}
