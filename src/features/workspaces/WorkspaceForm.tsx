"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { FormGrid, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { type TabOption, Tabs } from "@/components/ui/Tabs";
import { routes, workspaceDetailUrl, workspaceScope } from "@/config/routes";
import { useAgencies } from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
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

function PreviewSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
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
function WorkspaceForm({
  mode,
  agencyId,
  clientId,
  record,
}: {
  mode: "create" | "edit";
  agencyId: number;
  clientId: number;
  record?: WorkspaceRecord;
}) {
  const router = useRouter();
  const createMutation = useCreateWorkspace();
  const updateMutation = useUpdateWorkspace();
  const [submitError, setSubmitError] = useState("");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<WorkspaceProfile>({
    resolver: zodResolver(workspaceProfileSchema),
    defaultValues: {
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
  const tabs: readonly TabOption[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Workspace profile</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGrid>
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
              <FormField
                id="status"
                label="Status"
                error={errors.status?.message}
              >
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
      ),
    },
    {
      value: "market",
      label: "Market Profile",
      content: (
        <PreviewSection
          title="Market profile"
          description="These fields show the planned profile. The workspace API currently saves only currency and time zone on Overview."
        >
          <FormGrid>
            {[
              "Country",
              "Provinces",
              "Target markets",
              "Target languages",
              "Cultural audience segments",
              "Reporting period",
            ].map((label) => (
              <FormField
                id={"preview-" + label.toLowerCase().replaceAll(" ", "-")}
                label={label}
                key={label}
              >
                <Input
                  id={"preview-" + label.toLowerCase().replaceAll(" ", "-")}
                  disabled
                  placeholder="Awaiting API support"
                />
              </FormField>
            ))}
          </FormGrid>
        </PreviewSection>
      ),
    },
    {
      value: "modules",
      label: "Modules",
      content: (
        <PreviewSection
          title="Modules"
          description="Module controls are shown for review. The API cannot save these choices yet."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Reporting Dashboard",
              "Marketing Intelligence",
              "Media Mix Model",
            ].map((label) => (
              <label
                key={label}
                className="bg-muted flex items-center gap-3 rounded-lg border p-4 text-sm"
              >
                <input type="checkbox" disabled />
                {label}
              </label>
            ))}
          </div>
        </PreviewSection>
      ),
    },
    {
      value: "team",
      label: "Team and Access",
      content: (
        <PreviewSection
          title="Team and access"
          description="Workspace assignments and roles require a backend contract."
        >
          <FormGrid>
            <FormField id="preview-internal" label="Assigned internal users">
              <Input
                id="preview-internal"
                disabled
                placeholder="No assignments available"
              />
            </FormField>
            <FormField id="preview-client-users" label="Assigned client users">
              <Input
                id="preview-client-users"
                disabled
                placeholder="No assignments available"
              />
            </FormField>
          </FormGrid>
        </PreviewSection>
      ),
    },
    {
      value: "data",
      label: "Data",
      content: (
        <PreviewSection
          title="Data"
          description="Data source, active dataset, and import history are not part of the workspace profile API."
        >
          <FormGrid>
            <FormField id="preview-source" label="Data source">
              <Select id="preview-source" disabled>
                <option>Not available</option>
                <option>Seeded</option>
                <option>CSV Imported</option>
                <option>Future Connector</option>
              </Select>
            </FormField>
            <FormField id="preview-dataset" label="Active dataset">
              <Input
                id="preview-dataset"
                disabled
                placeholder="No dataset available"
              />
            </FormField>
          </FormGrid>
        </PreviewSection>
      ),
    },
    {
      value: "activity",
      label: "Activity",
      content: (
        <PreviewSection
          title="Activity"
          description="Workspace changes and import events will appear here when an activity endpoint is available."
        >
          <p className="text-muted-foreground rounded-lg border p-4 text-sm">
            No activity feed available.
          </p>
        </PreviewSection>
      ),
    },
  ];
  return (
    <PageStack>
      <PageHeader
        title={mode === "create" ? "Create workspace" : "Edit " + record?.name}
        description="Save the workspace profile and review planned management sections."
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
          setSubmitError("Review the highlighted fields on Overview.");
          document.getElementById("workspace-form-error")?.focus();
        })}
      >
        <div className="bg-card overflow-x-auto rounded-lg border p-4 sm:p-5">
          <Tabs items={tabs} />
        </div>
        <div className="bg-card sticky bottom-0 z-10 mt-5 flex flex-col-reverse gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {isDirty
              ? "Unsaved changes"
              : "Only fields on Overview are sent to the API."}
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
  const agencies = useAgencies({ page: 1 });
  const agencyId =
    requestedAgencyId ||
    user.data?.membership?.agencyId ||
    agencies.data?.data[0]?.id ||
    0;
  const clients = useClients(agencyId);
  const clientId =
    requestedClientId ||
    (user.data?.membership?.agencyId === agencyId
      ? user.data.membership.clientId
      : null) ||
    clients.data?.data[0]?.id ||
    0;
  const canManage =
    user.data?.platformRoleCode === "SUPER_ADMIN" ||
    (user.data?.membership?.roleCode === "AGENCY_ADMIN" &&
      user.data.membership.agencyId === agencyId);
  function select(agency: number, client: number) {
    router.replace(routes.workspaces.new + workspaceScope(agency, client));
  }
  if (
    user.isPending ||
    agencies.isPending ||
    (agencyId > 0 && clients.isPending)
  )
    return <p aria-busy="true">Loading workspace setup...</p>;
  if (agencies.isError || clients.isError)
    return (
      <StatePanel
        kind="error"
        title="Workspace setup unavailable"
        description="Agency or client choices could not be loaded."
        action={
          <Button
            onClick={() => {
              agencies.refetch();
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
              <Select
                id="create-workspace-agency"
                value={agencyId || ""}
                onChange={(event) => select(Number(event.target.value), 0)}
                disabled={user.data?.platformRoleCode !== "SUPER_ADMIN"}
              >
                <option value="">Select agency</option>
                {agencies.data?.data.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.display_name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="create-workspace-client" label="Client">
              <Select
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
            </FormField>
          </FormGrid>
        </CardContent>
      </Card>
      {clientId ? (
        <WorkspaceForm
          key={agencyId + "-" + clientId}
          mode="create"
          agencyId={agencyId}
          clientId={clientId}
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
  const canManage =
    user.data?.platformRoleCode === "SUPER_ADMIN" ||
    (user.data?.membership?.roleCode === "AGENCY_ADMIN" &&
      user.data.membership.agencyId === agencyId);
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
