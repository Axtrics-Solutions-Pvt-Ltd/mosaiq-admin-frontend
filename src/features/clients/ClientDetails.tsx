"use client";

import { Building, Gauge, Pencil, Plus, Power } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  clientEditUrl,
  routes,
  workspaceDetailUrl,
  workspaceEditUrl,
  workspaceScope,
} from "@/config/routes";
import { useAgency } from "@/features/agencies/queries";
import { useClient } from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";

import { useUpdateClient } from "./queries";

export function ClientDetailsScreen({
  agencyId,
  clientId,
}: {
  agencyId: number;
  clientId: number;
}) {
  const query = useClient(agencyId, clientId);
  const agencyQuery = useAgency(agencyId);
  const updateMutation = useUpdateClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  if (
    !Number.isSafeInteger(agencyId) ||
    agencyId <= 0 ||
    !Number.isSafeInteger(clientId) ||
    clientId <= 0
  )
    return (
      <StatePanel
        kind="error"
        title="Invalid client"
        description="The client link is invalid."
      />
    );
  if (query.isPending)
    return (
      <div aria-busy="true" className="p-8">
        Loading client...
      </div>
    );
  if (query.isError)
    return (
      <StatePanel
        kind="error"
        title="Client unavailable"
        description="The client could not be loaded."
        action={<Button onClick={() => query.refetch()}>Try again</Button>}
      />
    );
  const client = query.data;
  const agencyName = agencyQuery.data?.display_name ?? `Agency #${agencyId}`;
  const workspaces = client.workspaces ?? [];

  return (
    <PageStack>
      <PageHeader
        actions={
          <>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => setIsConfirming(true)}
              variant="outline"
            >
              <Power aria-hidden className="size-4" />
              {client.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <Button asChild>
              <Link href={clientEditUrl(client.id, agencyId)}>
                <Pencil aria-hidden className="size-4" /> Edit client
              </Link>
            </Button>
          </>
        }
        breadcrumbs={
          <>
            <Link className="hover:text-primary" href={routes.clients.index}>
              Clients
            </Link>
            <span aria-hidden> / </span>
            <span>{client.name}</span>
          </>
        }
        context={agencyName}
        description="Review the client profile and its workspaces."
        title={client.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          icon={Building}
          label="Status"
          value={client.status === "active" ? "Active" : "Inactive"}
        />
        <MetricCard
          icon={Gauge}
          label="Workspaces"
          value={String(client.workspace_count ?? workspaces.length)}
        />
      </div>
      {announcement && (
        <div
          role={updateMutation.isError ? "alert" : "status"}
          className={
            updateMutation.isError
              ? "text-destructive rounded-lg border p-4"
              : "text-success rounded-lg border p-4"
          }
        >
          {announcement}
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Workspaces</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  routes.workspaces.new + workspaceScope(agencyId, client.id)
                }
              >
                <Plus aria-hidden className="size-4" /> Add workspace
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <StatePanel
              kind="empty"
              title="No workspaces"
              description="This client has no workspaces yet."
            />
          ) : (
            <ul className="divide-y">
              {workspaces.map((workspace) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  key={workspace.id}
                >
                  <div>
                    <Link
                      className="text-strong hover:text-primary font-medium"
                      href={workspaceDetailUrl(
                        workspace.id,
                        agencyId,
                        client.id,
                      )}
                    >
                      {workspace.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {workspace.currency} / {workspace.timezone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={workspace.status} />
                    <Link
                      className="text-primary hover:underline"
                      href={workspaceEditUrl(workspace.id, agencyId, client.id)}
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs font-medium">
                Agency
              </dt>
              <dd className="text-strong mt-1 font-medium">{agencyName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium">
                Created
              </dt>
              <dd className="text-strong mt-1 font-medium">
                {client.created_at ? formatDate(client.created_at) : "--"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <ConfirmationDialog
        body="This status change will be saved immediately. An inactive client retains its workspaces and assignments for recovery."
        confirmLabel={
          client.status === "active" ? "Deactivate client" : "Activate client"
        }
        description={`Review the impact before changing ${client.name} to ${client.status === "active" ? "inactive" : "active"}.`}
        isOpen={isConfirming}
        isPending={updateMutation.isPending}
        onCancel={() => setIsConfirming(false)}
        onConfirm={async () => {
          try {
            await updateMutation.mutateAsync({
              agencyId,
              clientId: client.id,
              payload: {
                name: client.name,
                status: client.status === "active" ? "inactive" : "active",
              },
            });
            setAnnouncement("Client status updated.");
            setIsConfirming(false);
          } catch (error) {
            setAnnouncement(
              error instanceof ApiError
                ? error.message
                : "Client status could not be updated.",
            );
            setIsConfirming(false);
          }
        }}
        title={
          client.status === "active"
            ? "Deactivate this client?"
            : "Activate this client?"
        }
      />
    </PageStack>
  );
}
