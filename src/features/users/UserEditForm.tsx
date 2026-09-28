"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { assignableAgencyRoles } from "@/config/permissions";
import { userDetailUrl } from "@/config/routes";
import {
  type ClientAccessSelection,
  fromUserAccess,
  isSameSelection,
  toClientsPayload,
} from "@/features/invitations/client-access";
import {
  ClientWorkspaceTree,
  type PendingClientAccess,
} from "@/features/invitations/ClientWorkspaceTree";
import { InvitationScopeSelectors } from "@/features/invitations/InvitationScopeSelectors";
import type {
  ClientRecord,
  WorkspaceRecord,
} from "@/features/workspaces/contracts";
import { useClient, useWorkspacesByIds } from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";

import { updateAgencyUserSchema } from "./contracts";
import { useAgencyUser, useUpdateAgencyUser } from "./queries";
import { roleLabels } from "./role-labels";

// An empty role means the user holds a legacy role that must be replaced.
const formSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255),
  roleCode: z
    .union([z.enum(assignableAgencyRoles), z.literal("")])
    .refine((value) => value !== "", "Choose Agency Admin or Manager."),
  clientId: z.number().int().positive().nullable(),
  workspaceIds: z.array(z.number().int().positive()),
  status: z.enum(["active", "inactive"]),
});
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

function assignableRole(roleCode: string): FormInput["roleCode"] {
  return assignableAgencyRoles.find((code) => code === roleCode) ?? "";
}

export function UserEditForm({
  agencyId,
  userId,
}: {
  agencyId: number;
  userId: number;
}) {
  const router = useRouter();
  const userQuery = useAgencyUser(agencyId, userId);
  const updateMutation = useUpdateAgencyUser();
  const [scopeTouched, setScopeTouched] = useState(false);
  const [touchedClient, setTouchedClient] = useState<ClientRecord>();
  const [touchedWorkspaces, setTouchedWorkspaces] = useState<WorkspaceRecord[]>(
    [],
  );
  // The single client and workspace list are only used by the Agency Admin
  // restriction picker; a Manager's access comes from `access`.
  const usesRestrictionPicker =
    userQuery.data !== undefined && userQuery.data.role_code !== "MANAGER";
  const clientQuery = useClient(
    agencyId,
    usesRestrictionPicker ? (userQuery.data?.client_id ?? 0) : 0,
  );
  const workspacesQuery = useWorkspacesByIds(
    agencyId,
    usesRestrictionPicker ? (userQuery.data?.workspace_ids ?? []) : [],
  );
  // A Manager's access, as a client -> workspace selection.
  const initialAccess = useMemo(
    () => fromUserAccess(userQuery.data?.access ?? []),
    [userQuery.data],
  );
  const pendingAccess = useMemo<PendingClientAccess>(() => {
    const access = userQuery.data?.access ?? [];
    return {
      allWorkspacesClientIds: new Set(
        access
          .filter((entry) => entry.pending_all_workspaces)
          .map((entry) => entry.client_id),
      ),
      workspaceIds: new Set(
        access.flatMap((entry) => entry.pending_workspace_ids),
      ),
    };
  }, [userQuery.data]);
  const clientNames = useMemo(
    () =>
      Object.fromEntries(
        (userQuery.data?.access ?? []).map((entry) => [
          entry.client_id,
          entry.client_name ?? `Client #${entry.client_id}`,
        ]),
      ),
    [userQuery.data],
  );
  const [editedAccess, setEditedAccess] = useState<ClientAccessSelection>();
  const [clientsError, setClientsError] = useState<string>();
  const clientAccess = editedAccess ?? initialAccess;
  const selectedClient = scopeTouched ? touchedClient : clientQuery.data;
  const selectedWorkspaces = scopeTouched
    ? touchedWorkspaces
    : workspacesQuery.data;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      roleCode: "",
      clientId: null,
      workspaceIds: [],
      status: "active",
    },
  });
  const roleCode = useWatch({ control, name: "roleCode" });
  const roleRegistration = register("roleCode");
  const wasManager = userQuery.data?.role_code === "MANAGER";
  const isAccessChanged =
    editedAccess !== undefined && !isSameSelection(editedAccess, initialAccess);

  useEffect(() => {
    if (!userQuery.data) return;
    reset({
      name: userQuery.data.name,
      roleCode: assignableRole(userQuery.data.role_code),
      clientId: userQuery.data.client_id,
      workspaceIds: userQuery.data.workspace_ids,
      status: userQuery.data.status === "inactive" ? "inactive" : "active",
    });
  }, [userQuery.data, reset]);

  const hasUnsavedChanges = isDirty || isAccessChanged;
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  function clearScope(nextRoleCode: string) {
    setClientsError(undefined);
    // Switching back to Manager restores what the Manager holds.
    setEditedAccess(nextRoleCode === "MANAGER" && wasManager ? undefined : {});
    setScopeTouched(true);
    setTouchedClient(undefined);
    setTouchedWorkspaces([]);
    setValue("clientId", null, { shouldDirty: true });
    setValue("workspaceIds", [], { shouldDirty: true });
  }

  const onSubmit = handleSubmit(async (values) => {
    const isManager = values.roleCode === "MANAGER";
    // A Manager's `clients` replaces their access, so it is only sent when the
    // selection changed or the user becomes a Manager.
    const sendsClients = isManager && (isAccessChanged || !wasManager);
    setClientsError(undefined);
    if (isManager && toClientsPayload(clientAccess).length === 0) {
      setClientsError("Choose at least one client for this Manager.");
      return;
    }
    const parsed = updateAgencyUserSchema.safeParse({
      name: values.name.trim(),
      role_code: values.roleCode,
      client_id: null,
      status: values.status,
      ...(isManager
        ? sendsClients
          ? { clients: toClientsPayload(clientAccess) }
          : {}
        : { workspace_ids: values.workspaceIds }),
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "clients") setClientsError(issue.message);
        if (issue.path[0] === "workspace_ids")
          setError("workspaceIds", { message: issue.message });
      }
      return;
    }
    try {
      await updateMutation.mutateAsync({
        agencyId,
        userId,
        payload: parsed.data,
      });
      toast({ title: "User updated.", tone: "success" });
      router.push(userDetailUrl(userId, agencyId));
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors;
        if (fields.name) setError("name", { message: fields.name });
        if (fields.role_code)
          setError("roleCode", { message: fields.role_code });
        if (fields.client_id)
          setError("clientId", { message: fields.client_id });
        if (fields.workspace_ids)
          setError("workspaceIds", { message: fields.workspace_ids });
        const clientsField = Object.keys(fields).find((field) =>
          field.startsWith("clients"),
        );
        if (clientsField) setClientsError(fields[clientsField]);
        if (fields.status) setError("status", { message: fields.status });
        toast({ title: error.message, tone: "error" });
      } else {
        toast({
          title: "The user could not be updated. Please try again.",
          tone: "error",
        });
      }
    }
  });

  if (userQuery.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading user" className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (userQuery.isError) {
    return (
      <StatePanel
        action={<Button onClick={() => userQuery.refetch()}>Try again</Button>}
        description="This user could not be loaded. Please try again."
        kind="error"
        title="User unavailable"
      />
    );
  }

  if (userQuery.data.status === "invited") {
    return (
      <StatePanel
        action={
          <Button asChild variant="outline">
            <Link href={userDetailUrl(userId, agencyId)}>Back to user</Link>
          </Button>
        }
        description="This user must accept their invitation before their role, access, or status can be changed."
        kind="permission"
        title="Editing unavailable"
      />
    );
  }

  const hasLegacyRole = assignableRole(userQuery.data.role_code) === "";

  return (
    <PageStack>
      <PageHeader
        breadcrumbs={
          <Link
            className="hover:text-primary"
            href={userDetailUrl(userId, agencyId)}
          >
            {userQuery.data.name}
          </Link>
        }
        description="Update this user's role, access, and account status."
        title="Edit user"
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>User details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" noValidate onSubmit={onSubmit}>
            <FormField
              error={errors.name?.message}
              id="edit-name"
              label="Name"
              required
            >
              <Input
                aria-invalid={Boolean(errors.name)}
                id="edit-name"
                {...register("name")}
              />
            </FormField>
            <FormField
              error={errors.roleCode?.message}
              id="edit-role"
              label="Role"
              required
            >
              <Select
                aria-invalid={Boolean(errors.roleCode)}
                id="edit-role"
                {...roleRegistration}
                onChange={(event) => {
                  roleRegistration.onChange(event);
                  clearScope(event.target.value);
                }}
              >
                {hasLegacyRole && (
                  <option disabled value="">
                    Choose a role
                  </option>
                )}
                {assignableAgencyRoles.map((code) => (
                  <option key={code} value={code}>
                    {roleLabels[code]}
                  </option>
                ))}
              </Select>
              {hasLegacyRole && (
                <p className="text-muted-foreground mt-1.5 text-xs">
                  This user has the retired{" "}
                  {roleLabels[userQuery.data.role_code]} role. Choose Agency
                  Admin or Manager to save changes.
                </p>
              )}
            </FormField>
            <FormField
              error={errors.status?.message}
              id="edit-status"
              label="Account status"
              required
            >
              <Select id="edit-status" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
            {roleCode === "MANAGER" ? (
              <FormField
                description="Tick a client for all its workspaces, including ones added later, or open it to choose workspaces."
                error={clientsError}
                id="edit-clients"
                label="Clients"
                required
              >
                <ClientWorkspaceTree
                  agencyId={agencyId}
                  clientNames={clientNames}
                  error={clientsError}
                  id="edit-clients"
                  onChange={(selection) => {
                    setEditedAccess(selection);
                    setClientsError(undefined);
                  }}
                  pending={pendingAccess}
                  value={clientAccess}
                />
                {(isAccessChanged || !wasManager) && (
                  <p className="bg-muted mt-2 rounded-lg border p-3 text-xs">
                    Removed access is revoked as soon as you save. Newly added
                    clients or workspaces are sent to the user as one invitation
                    email and apply once accepted.
                  </p>
                )}
              </FormField>
            ) : (
              <InvitationScopeSelectors
                agencyId={agencyId}
                client={selectedClient}
                clientError={errors.clientId?.message}
                mode="restriction"
                onClientChange={(client) => {
                  setScopeTouched(true);
                  setTouchedClient(client);
                  setTouchedWorkspaces([]);
                  setValue("clientId", client.id, { shouldDirty: true });
                  setValue("workspaceIds", [], { shouldDirty: true });
                }}
                onWorkspacesChange={(workspaces) => {
                  setScopeTouched(true);
                  setTouchedWorkspaces(workspaces);
                  setValue(
                    "workspaceIds",
                    workspaces.map((workspace) => workspace.id),
                    { shouldDirty: true },
                  );
                }}
                workspaceError={errors.workspaceIds?.message}
                workspaces={selectedWorkspaces}
              />
            )}
            <div className="flex flex-wrap gap-3 border-t pt-5">
              <Button disabled={updateMutation.isPending} type="submit">
                {updateMutation.isPending ? (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Save aria-hidden className="size-4" />
                )}
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={userDetailUrl(userId, agencyId)}>Cancel</Link>
              </Button>
              {hasUnsavedChanges && (
                <p className="text-muted-foreground self-center text-xs">
                  Unsaved changes
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </PageStack>
  );
}
