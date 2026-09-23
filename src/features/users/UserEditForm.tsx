"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { userDetailUrl } from "@/config/routes";
import { InvitationScopeSelectors } from "@/features/invitations/InvitationScopeSelectors";
import type {
  ClientRecord,
  WorkspaceRecord,
} from "@/features/workspaces/contracts";
import { useClient, useWorkspacesByIds } from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";

import { agencyUserRoles, updateAgencyUserSchema } from "./contracts";
import { useAgencyUser, useUpdateAgencyUser } from "./queries";

const roles = [
  { code: "AGENCY_ADMIN", label: "Agency Admin" },
  { code: "MANAGER", label: "Manager" },
  { code: "ANALYST", label: "Analyst" },
  { code: "VIEWER", label: "Viewer" },
  { code: "CLIENT_USER", label: "Client User" },
] as const;

const formSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255),
  roleCode: z.enum(agencyUserRoles),
  clientId: z.number().int().positive().nullable(),
  workspaceIds: z.array(z.number().int().positive()),
  status: z.enum(["active", "inactive"]),
});
type FormValues = z.infer<typeof formSchema>;

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
  const clientQuery = useClient(agencyId, userQuery.data?.client_id ?? 0);
  const workspacesQuery = useWorkspacesByIds(
    agencyId,
    userQuery.data?.workspace_ids ?? [],
  );
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
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      roleCode: "VIEWER",
      clientId: null,
      workspaceIds: [],
      status: "active",
    },
  });
  const roleCode = useWatch({ control, name: "roleCode" });
  const roleRegistration = register("roleCode");

  useEffect(() => {
    if (!userQuery.data) return;
    reset({
      name: userQuery.data.name,
      roleCode: userQuery.data.role_code,
      clientId: userQuery.data.client_id,
      workspaceIds: userQuery.data.workspace_ids,
      status: userQuery.data.status === "inactive" ? "inactive" : "active",
    });
  }, [userQuery.data, reset]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function clearScope() {
    setScopeTouched(true);
    setTouchedClient(undefined);
    setTouchedWorkspaces([]);
    setValue("clientId", null, { shouldDirty: true });
    setValue("workspaceIds", [], { shouldDirty: true });
  }

  const onSubmit = handleSubmit(async (values) => {
    const parsed = updateAgencyUserSchema.safeParse({
      name: values.name.trim(),
      role_code: values.roleCode,
      ...(values.roleCode === "CLIENT_USER" && values.clientId
        ? { client_id: values.clientId }
        : { client_id: null }),
      workspace_ids: values.workspaceIds,
      status: values.status,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "client_id")
          setError("clientId", { message: issue.message });
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
                id="edit-role"
                {...roleRegistration}
                onChange={(event) => {
                  roleRegistration.onChange(event);
                  clearScope();
                }}
              >
                {roles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.label}
                  </option>
                ))}
              </Select>
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
            <InvitationScopeSelectors
              agencyId={agencyId}
              client={selectedClient}
              clientError={errors.clientId?.message}
              isClientUser={roleCode === "CLIENT_USER"}
              isScopeRequired={roleCode === "CLIENT_USER"}
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
              {isDirty && (
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
