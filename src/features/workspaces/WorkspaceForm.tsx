"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { FormGrid, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  clientScope,
  routes,
  workspaceDetailUrl,
  workspaceScope,
} from "@/config/routes";
import { useAgencies, useAgency } from "@/features/agencies/queries";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ChannelBadge } from "@/features/channels/ChannelBadge";
import { useChannels } from "@/features/channels/queries";
import { ApiError } from "@/lib/api/errors";

import {
  type WorkspaceProfile,
  workspaceProfileSchema,
  type WorkspaceRecord,
} from "./contracts";
import {
  useClients,
  useCreateWorkspace,
  useUpdateWorkspace,
  useWorkspace,
} from "./queries";

function suggestedWorkspaceName(clientName: string, channelName: string) {
  return `${clientName} – ${channelName}`;
}
function WorkspaceForm({
  mode,
  agencyId,
  clientId,
  clientName,
  record,
}: {
  mode: "create" | "edit";
  agencyId: number;
  clientId: number;
  clientName?: string;
  record?: WorkspaceRecord;
}) {
  const router = useRouter();
  const createMutation = useCreateWorkspace();
  const updateMutation = useUpdateWorkspace();
  // Only a new workspace, or a legacy one without a channel, picks a channel.
  const isChannelLocked = Boolean(record?.connector_id);
  const channels = useChannels({ enabled: !isChannelLocked });
  const [submitError, setSubmitError] = useState("");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [lastSuggestedName, setLastSuggestedName] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useForm<WorkspaceProfile>({
    resolver: zodResolver(workspaceProfileSchema),
    defaultValues: {
      connector_id: record?.connector_id ?? undefined,
      name: record?.name ?? "",
      timezone: record?.timezone ?? "Europe/London",
      currency: record?.currency ?? "USD",
      status: record?.status ?? "active",
    },
  });
  const backHref = record
    ? workspaceDetailUrl(record.id, agencyId, clientId)
    : routes.workspaces.index + workspaceScope(agencyId, clientId);
  const isPending = createMutation.isPending || updateMutation.isPending;
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const activeChannels = channels.data ?? [];
  const selectedChannelId = watch("connector_id");
  const selectedChannel = activeChannels.find(
    (channel) => channel.id === selectedChannelId,
  );
  // Suggest "{Client} – {Channel}" until the name is edited by hand.
  function suggestName(channelId: number) {
    const channel = activeChannels.find((entry) => entry.id === channelId);
    if (mode !== "create" || !channel || !clientName) return;
    const suggestion = suggestedWorkspaceName(clientName, channel.name);
    const currentName = getValues("name");
    if (!currentName.trim() || currentName === lastSuggestedName)
      setValue("name", suggestion, { shouldDirty: true, shouldValidate: true });
    setLastSuggestedName(suggestion);
  }
  async function submit(values: WorkspaceProfile) {
    setSubmitError("");
    try {
      const saved =
        mode === "create"
          ? await createMutation.mutateAsync({
              agencyId,
              clientId,
              payload: values,
            })
          : await updateMutation.mutateAsync({
              agencyId,
              clientId,
              workspaceId: record!.id,
              payload: values,
            });
      router.push(workspaceDetailUrl(saved.id, agencyId, clientId));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of [
          "connector_id",
          "name",
          "timezone",
          "currency",
          "status",
        ] as const) {
          if (error.fieldErrors[field])
            setError(field, {
              type: "server",
              message: error.fieldErrors[field],
            });
        }
        setSubmitError(error.message);
      } else
        setSubmitError("The workspace could not be saved. Please try again.");
      document.getElementById("workspace-form-error")?.focus();
    }
  }
  const profileCard = (
    <Card>
      <CardHeader>
        <CardTitle>Workspace profile</CardTitle>
      </CardHeader>
      <CardContent>
        <FormGrid>
          {isChannelLocked ? (
            <div className="md:col-span-2">
              <p className="text-muted-foreground text-xs font-medium">
                Channel
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ChannelBadge channel={record?.connector ?? null} />
                <span className="text-muted-foreground text-xs">
                  A workspace&apos;s channel can&apos;t be changed.
                </span>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2">
              <FormField
                description={
                  mode === "edit"
                    ? "This workspace was created before channels. Choose its channel once; it can't be changed later."
                    : "Each workspace reports one channel for its client."
                }
                error={
                  errors.connector_id?.message ??
                  (channels.isError
                    ? "Channels could not be loaded. Reload the page to try again."
                    : undefined)
                }
                id="connector_id"
                label="Channel"
                required
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    aria-describedby={
                      errors.connector_id
                        ? "connector_id-error"
                        : "connector_id-description"
                    }
                    aria-invalid={Boolean(errors.connector_id)}
                    className="min-w-60"
                    disabled={!channels.isSuccess}
                    id="connector_id"
                    {...register("connector_id", {
                      setValueAs: (value: string | number | undefined) =>
                        value === "" || value === undefined
                          ? undefined
                          : Number(value),
                      onChange: (event) =>
                        suggestName(Number(event.target.value)),
                    })}
                  >
                    <option value="">
                      {channels.isPending
                        ? "Loading channels..."
                        : activeChannels.length === 0
                          ? "No active channels"
                          : "Select a channel"}
                    </option>
                    {activeChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </Select>
                  {selectedChannel && (
                    <ChannelBadge channel={selectedChannel} />
                  )}
                </div>
              </FormField>
              {channels.isSuccess && activeChannels.length === 0 && (
                <p className="text-muted-foreground mt-2 text-xs">
                  A Super Admin must add an active channel before workspaces can
                  be created.
                </p>
              )}
            </div>
          )}
          <FormField
            id="name"
            label="Workspace name"
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              placeholder="Client reporting workspace"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
          </FormField>
          <FormField id="status" label="Status" error={errors.status?.message}>
            <Select id="status" {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
          <FormField
            id="currency"
            label="Default currency"
            error={errors.currency?.message}
          >
            <Select id="currency" {...register("currency")}>
              {["AUD", "EUR", "GBP", "INR", "USD", record?.currency]
                .filter((value): value is string => Boolean(value))
                .filter((value, index, all) => all.indexOf(value) === index)
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField
            id="timezone"
            label="Time zone"
            error={errors.timezone?.message}
          >
            <Select id="timezone" {...register("timezone")}>
              {[
                "Europe/London",
                "America/New_York",
                "Asia/Kolkata",
                "Australia/Sydney",
                record?.timezone,
              ]
                .filter((value): value is string => Boolean(value))
                .filter((value, index, all) => all.indexOf(value) === index)
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </Select>
          </FormField>
        </FormGrid>
      </CardContent>
    </Card>
  );
  return (
    <PageStack>
      <PageHeader
        title={mode === "create" ? "Create workspace" : "Edit " + record?.name}
        description="Save the workspace profile."
        breadcrumbs={<Link href={backHref}>Workspaces</Link>}
      />
      {submitError && (
        <p
          className="text-destructive rounded-lg border p-4"
          id="workspace-form-error"
          role="alert"
          tabIndex={-1}
        >
          {submitError}
        </p>
      )}
      <form
        noValidate
        onSubmit={handleSubmit(submit, () => {
          setSubmitError("Review the highlighted fields.");
          document.getElementById("workspace-form-error")?.focus();
        })}
      >
        {profileCard}
        <div className="bg-card sticky bottom-0 z-10 mt-5 flex flex-col-reverse gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {isDirty ? "Unsaved changes" : "No unsaved changes"}
          </p>
          <div className="flex gap-2">
            {isDirty ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDiscarding(true)}
              >
                <ArrowLeft aria-hidden className="size-4" /> Cancel
              </Button>
            ) : (
              <Button asChild type="button" variant="outline">
                <Link href={backHref}>
                  <ArrowLeft aria-hidden className="size-4" /> Cancel
                </Link>
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              <Save aria-hidden className="size-4" />
              {isPending
                ? "Saving..."
                : mode === "create"
                  ? "Create workspace"
                  : "Save workspace"}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={isDiscarding}
        title="Discard changes?"
        description="Your edits have not been saved."
        body={<p>Your unsaved workspace changes will be discarded.</p>}
        confirmLabel="Discard changes"
        onCancel={() => setIsDiscarding(false)}
        onConfirm={() => router.push(backHref)}
      />
    </PageStack>
  );
}
export function WorkspaceCreateScreen({
  agencyId: requestedAgencyId,
  clientId: requestedClientId,
}: {
  agencyId: number;
  clientId: number;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const isSuperAdmin = user.data?.platformRoleCode === "SUPER_ADMIN";
  // Only a Super Admin can list agencies; everyone else works in their own.
  const agencies = useAgencies({ page: 1 }, { enabled: isSuperAdmin });
  const agencyId = isSuperAdmin
    ? requestedAgencyId || agencies.data?.data[0]?.id || 0
    : (user.data?.membership?.agencyId ?? 0);
  const ownAgency = useAgency(isSuperAdmin ? 0 : agencyId);
  // For a Manager the API lists only the clients they can view.
  const clients = useClients(agencyId);
  const clientId =
    requestedClientId ||
    (user.data?.membership?.agencyId === agencyId
      ? user.data.membership.clientId
      : null) ||
    clients.data?.data[0]?.id ||
    0;
  const clientName = clients.data?.data.find(
    (client) => client.id === clientId,
  )?.name;
  const canManage = Boolean(
    user.data && hasCapability(user.data, "workspaces.manage"),
  );
  const canAddClient = Boolean(
    user.data && hasCapability(user.data, "clients.manage"),
  );
  function select(agency: number, client: number) {
    router.replace(routes.workspaces.new + workspaceScope(agency, client));
  }
  if (
    user.isPending ||
    (isSuperAdmin && agencies.isPending) ||
    (agencyId > 0 && clients.isPending)
  )
    return <p aria-busy="true">Loading workspace setup...</p>;
  if ((isSuperAdmin && agencies.isError) || clients.isError)
    return (
      <StatePanel
        kind="error"
        title="Workspace setup unavailable"
        description="Agency or client choices could not be loaded."
        action={
          <Button
            onClick={() => {
              if (isSuperAdmin) agencies.refetch();
              clients.refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  if (!canManage)
    return (
      <StatePanel
        kind="permission"
        title="Workspace creation unavailable"
        description="You do not have permission to create a workspace in this agency."
      />
    );
  return (
    <PageStack>
      <Card>
        <CardHeader>
          <CardTitle>Workspace owner</CardTitle>
        </CardHeader>
        <CardContent>
          <FormGrid>
            <FormField id="create-workspace-agency" label="Agency">
              {isSuperAdmin ? (
                <Select
                  id="create-workspace-agency"
                  value={agencyId || ""}
                  onChange={(event) => select(Number(event.target.value), 0)}
                >
                  <option value="">Select agency</option>
                  {agencies.data?.data.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.display_name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="create-workspace-agency"
                  readOnly
                  value={ownAgency.data?.display_name ?? ""}
                />
              )}
            </FormField>
            <FormField id="create-workspace-client" label="Client">
              {clients.data?.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {canAddClient ? (
                    <>
                      This agency has no clients yet.{" "}
                      <Link
                        className="text-primary hover:underline"
                        href={routes.clients.new + clientScope(agencyId)}
                      >
                        Add a client
                      </Link>{" "}
                      before creating a workspace.
                    </>
                  ) : (
                    "There are no clients you can add a workspace to."
                  )}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    className="flex-1"
                    id="create-workspace-client"
                    value={clientId || ""}
                    onChange={(event) =>
                      select(agencyId, Number(event.target.value))
                    }
                  >
                    <option value="">Select client</option>
                    {clients.data?.data.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </Select>
                  {canAddClient && (
                    <Button asChild size="sm" type="button" variant="outline">
                      <Link href={routes.clients.new + clientScope(agencyId)}>
                        Add client
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </FormField>
          </FormGrid>
        </CardContent>
      </Card>
      {clients.data?.data.length === 0 ? (
        <StatePanel
          kind="empty"
          title="This agency has no clients yet"
          description={
            canAddClient
              ? "Create a client for this agency first."
              : "Ask an Agency Admin to add a client or give you access to one."
          }
          action={
            canAddClient ? (
              <Button asChild>
                <Link href={routes.clients.new + clientScope(agencyId)}>
                  Add client
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : clientId ? (
        <WorkspaceForm
          key={agencyId + "-" + clientId}
          mode="create"
          agencyId={agencyId}
          clientId={clientId}
          clientName={clientName}
        />
      ) : (
        <StatePanel
          kind="empty"
          title="Choose a client"
          description="A workspace must belong to an existing client."
        />
      )}
    </PageStack>
  );
}
export function WorkspaceEditScreen({
  agencyId,
  clientId,
  workspaceId,
}: {
  agencyId: number;
  clientId: number;
  workspaceId: number;
}) {
  const query = useWorkspace(agencyId, clientId, workspaceId);
  const user = useCurrentUser();
  if (
    ![agencyId, clientId, workspaceId].every(
      (id) => Number.isSafeInteger(id) && id > 0,
    )
  )
    return (
      <StatePanel
        kind="error"
        title="Workspace scope required"
        description="Open this workspace from the directory to edit it."
        action={
          <Button asChild>
            <Link href={routes.workspaces.index}>Open workspaces</Link>
          </Button>
        }
      />
    );
  if (query.isPending || user.isPending)
    return <p aria-busy="true">Loading workspace...</p>;
  if (query.isError)
    return (
      <StatePanel
        kind="error"
        title="Workspace unavailable"
        description="The workspace could not be loaded."
        action={<Button onClick={() => query.refetch()}>Try again</Button>}
      />
    );
  const canManage = Boolean(
    user.data && hasCapability(user.data, "workspaces.manage"),
  );
  if (!canManage)
    return (
      <StatePanel
        kind="permission"
        title="Workspace editing unavailable"
        description="You do not have permission to edit this workspace."
      />
    );
  return (
    <WorkspaceForm
      key={query.data.id}
      mode="edit"
      record={query.data}
      agencyId={agencyId}
      clientId={clientId}
    />
  );
}
