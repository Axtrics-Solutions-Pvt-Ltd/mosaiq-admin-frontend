"use client";

import { Pencil, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { WorkspaceActivityCard } from "./WorkspaceActivityCard";
import { WorkspaceTeamCard } from "./WorkspaceTeamCard";

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
        title: "Channel deleted",
        description: `${record.name} was removed from reports and its access was revoked.`,
        tone: "success",
      });
      router.push(clientDetailUrl(record.client_id, record.agency_id));
    } catch {
      setError("The channel could not be deleted. Please try again.");
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
      confirmLabel="Delete channel"
      description="This removes the channel for everyone."
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
        title="Channel scope required"
        description="Open this channel from the directory so its agency and client are known."
        action={
          <Button asChild>
            <Link href={routes.workspaces.index}>Open channels</Link>
          </Button>
        }
      />
    );
  if (workspace.isPending) return <p aria-busy="true">Loading channel...</p>;
  if (workspace.isError)
    return (
      <StatePanel
        kind="error"
        title="Channel unavailable"
        description="The channel could not be loaded."
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
  const canManageUsers = Boolean(
    user.data && hasCapability(user.data, "users.manage"),
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
      setError("The channel status could not be changed. Please try again.");
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
              <CardTitle>Channel overview</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                values={[
                  { label: "Channel", value: record.name },
                  {
                    label: "Platform",
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
                Channel status is saved to the API.
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
    ...(canManageUsers
      ? [
          {
            value: "team",
            label: "Team and Access",
            content: (
              <WorkspaceTeamCard
                agencyId={agencyId}
                clientId={clientId}
                workspaceId={workspaceId}
              />
            ),
          },
        ]
      : []),
    {
      value: "activity",
      label: "Activity",
      content: (
        <WorkspaceActivityCard
          agencyId={agencyId}
          clientId={clientId}
          workspaceId={workspaceId}
        />
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
        description="Channel details and management."
        breadcrumbs={<Link href={routes.workspaces.index}>Channels</Link>}
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
                  <Trash2 aria-hidden className="size-4" /> Delete channel
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
            ? "Deactivate channel?"
            : "Activate channel?"
        }
        description="This changes the channel status in the API."
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
