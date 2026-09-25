"use client";

import { Pencil, Plug, Plus } from "lucide-react";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";
import { formatNumber } from "@/lib/formatters";

import { ChannelBadge } from "./ChannelBadge";
import { ChannelFormDrawer } from "./ChannelFormDrawer";
import { type Channel, channelCategoryLabels } from "./contracts";
import { useAdminChannels } from "./queries";

type Editing = { mode: "create" } | { mode: "edit"; channel: Channel };

function categoryLabel(category: string) {
  return category === "ads" || category === "analytics"
    ? channelCategoryLabels[category]
    : category;
}

function EditButton({
  channel,
  onEdit,
}: {
  channel: Channel;
  onEdit: (channel: Channel) => void;
}) {
  return (
    <Button
      aria-label={`Edit ${channel.name}`}
      onClick={() => onEdit(channel)}
      size="sm"
      variant="outline"
    >
      <Pencil aria-hidden className="size-4" /> Edit
    </Button>
  );
}

function ChannelCard({
  channel,
  onEdit,
}: {
  channel: Channel;
  onEdit: (channel: Channel) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-strong font-semibold">{channel.name}</p>
            <p className="text-muted-foreground text-xs">{channel.code}</p>
          </div>
          <StatusBadge status={channel.is_active ? "active" : "inactive"} />
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Category</dt>
            <dd>{categoryLabel(channel.category)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Workspaces</dt>
            <dd className="tabular-nums">
              {formatNumber(channel.workspace_count ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Position</dt>
            <dd className="tabular-nums">{channel.position}</dd>
          </div>
        </dl>
        <EditButton channel={channel} onEdit={onEdit} />
      </CardContent>
    </Card>
  );
}

export function ChannelDirectory() {
  const currentUser = useCurrentUser();
  const canManage = Boolean(
    currentUser.data && hasCapability(currentUser.data, "channels.manage"),
  );
  const query = useAdminChannels({ enabled: canManage });
  const [editing, setEditing] = useState<Editing>();
  const channels = [...(query.data ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const edit = (channel: Channel) => setEditing({ mode: "edit", channel });
  const isForbidden =
    (currentUser.isSuccess && !canManage) ||
    (query.error instanceof ApiError && query.error.status === 403);

  const columns: readonly DataTableColumn<Channel>[] = [
    {
      id: "name",
      header: "Channel",
      render: (channel) => (
        <div className="flex flex-col items-start gap-1">
          <ChannelBadge channel={channel} />
        </div>
      ),
    },
    {
      id: "code",
      header: "Code",
      render: (channel) => <code className="text-xs">{channel.code}</code>,
    },
    {
      id: "category",
      header: "Category",
      render: (channel) => categoryLabel(channel.category),
    },
    {
      id: "active",
      header: "Status",
      render: (channel) => (
        <StatusBadge status={channel.is_active ? "active" : "inactive"} />
      ),
    },
    {
      id: "workspaces",
      header: "Workspaces using it",
      align: "right",
      render: (channel) => formatNumber(channel.workspace_count ?? 0),
    },
    {
      id: "position",
      header: "Position",
      align: "right",
      render: (channel) => channel.position,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (channel) => <EditButton channel={channel} onEdit={edit} />,
    },
  ];

  return (
    <PageStack>
      <PageHeader
        actions={
          canManage && query.isSuccess ? (
            <Button onClick={() => setEditing({ mode: "create" })}>
              <Plus aria-hidden className="size-4" /> Add channel
            </Button>
          ) : undefined
        }
        description="The data channels a workspace can connect to, the credentials each one needs, and the metrics it reports."
        title="Channels"
      />
      {isForbidden && (
        <StatePanel
          description="Only Super Admins can manage the channel catalogue."
          kind="permission"
          title="Channels unavailable"
        />
      )}
      {(currentUser.isPending || (canManage && query.isPending)) && (
        <div
          aria-busy="true"
          aria-label="Loading channels"
          className="space-y-3"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
      {!isForbidden && query.isError && (
        <StatePanel
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
          description="The channel catalogue could not be loaded."
          kind="error"
          title="Channels unavailable"
        />
      )}
      {query.isSuccess && channels.length === 0 && (
        <StatePanel
          action={
            <Button onClick={() => setEditing({ mode: "create" })}>
              <Plug aria-hidden className="size-4" /> Add the first channel
            </Button>
          }
          description="Add a channel so workspaces can be created for it."
          kind="empty"
          title="No channels yet"
        />
      )}
      {query.isSuccess && channels.length > 0 && (
        <DataTable
          caption="Channel catalogue"
          columns={columns}
          getRowKey={(channel) => String(channel.id)}
          mobileCard={(channel) => (
            <ChannelCard channel={channel} onEdit={edit} />
          )}
          rows={channels}
        />
      )}
      {editing && (
        <ChannelFormDrawer
          channel={editing.mode === "edit" ? editing.channel : undefined}
          key={editing.mode === "edit" ? editing.channel.id : "new"}
          onClose={() => setEditing(undefined)}
        />
      )}
    </PageStack>
  );
}
