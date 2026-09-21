"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { routes, userInvitationsUrl } from "@/config/routes";
import {
  AgencyCombobox,
  type AgencyOption,
} from "@/features/agencies/AgencyCombobox";
import { useCurrentUser } from "@/features/auth/queries";
import type {
  ClientRecord,
  WorkspaceRecord,
} from "@/features/workspaces/contracts";
import { ApiError } from "@/lib/api/errors";

import { invitationRoles, inviteSchema } from "./contracts";
import { InvitationScopeSelectors } from "./InvitationScopeSelectors";
import { useCreateInvitation } from "./queries";

const formSchema = z.object({
  agencyId: z.number().int().positive().nullable(),
  email: z.email("Enter a valid email address."),
  roleCode: z.enum(invitationRoles),
  clientId: z.number().int().positive().nullable(),
  workspaceIds: z.array(z.number().int().positive()),
});
type FormValues = z.infer<typeof formSchema>;

const roles = [
  { code: "AGENCY_ADMIN", label: "Agency Admin" },
  { code: "MANAGER", label: "Manager" },
  { code: "ANALYST", label: "Analyst" },
  { code: "VIEWER", label: "Viewer" },
  { code: "CLIENT_USER", label: "Client User" },
] as const;

export function InviteUserForm() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const createMutation = useCreateInvitation();
  const [selectedAgency, setSelectedAgency] = useState<AgencyOption>();
  const [selectedClient, setSelectedClient] = useState<ClientRecord>();
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<
    WorkspaceRecord[]
  >([]);
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  const ownAgencyId = currentUser.data?.membership?.agencyId;
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyId: null,
      email: "",
      roleCode: "VIEWER",
      clientId: null,
      workspaceIds: [],
    },
  });
  const roleCode = useWatch({ control, name: "roleCode" });
  const roleRegistration = register("roleCode");
  const agencyId = isSuperAdmin ? selectedAgency?.id : ownAgencyId;

  function clearScope() {
    setSelectedClient(undefined);
    setSelectedWorkspaces([]);
    setValue("clientId", null);
    setValue("workspaceIds", []);
  }

  const onSubmit = handleSubmit(async (values) => {
    const targetAgencyId = isSuperAdmin ? values.agencyId : ownAgencyId;
    if (!targetAgencyId) {
      setError("agencyId", { message: "Choose an agency." });
      return;
    }
    const parsed = inviteSchema.safeParse({
      email: values.email.trim(),
      role_code: values.roleCode,
      ...(values.roleCode === "CLIENT_USER" && values.clientId
        ? { client_id: values.clientId }
        : {}),
      workspace_ids: values.workspaceIds,
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
      await createMutation.mutateAsync({
        agencyId: targetAgencyId,
        payload: parsed.data,
      });
      toast({
        title: `Invitation emailed to ${parsed.data.email}.`,
        tone: "success",
      });
      router.push(userInvitationsUrl(targetAgencyId));
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors;
        if (fields.email) setError("email", { message: fields.email });
        if (fields.role_code)
          setError("roleCode", { message: fields.role_code });
        if (fields.client_id)
          setError("clientId", { message: fields.client_id });
        if (fields.workspace_ids)
          setError("workspaceIds", { message: fields.workspace_ids });
        toast({ title: error.message, tone: "error" });
      } else {
        toast({
          title: "The invitation could not be sent. Please try again.",
          tone: "error",
        });
      }
    }
  });

  return (
    <PageStack>
      <PageHeader
        breadcrumbs={
          <>
            <Link className="hover:text-primary" href={routes.users.index}>
              Users
            </Link>{" "}
            / Invite user
          </>
        }
        description="Email an invitation for a fixed role and its agency access."
        title="Invite user"
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Invitation details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" noValidate onSubmit={onSubmit}>
            <FormField
              error={errors.email?.message}
              id="invite-email"
              label="Email"
              required
            >
              <Input
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
                id="invite-email"
                type="email"
                {...register("email")}
              />
            </FormField>
            <FormField
              error={errors.roleCode?.message}
              id="invite-role"
              label="Role"
              required
            >
              <Select
                id="invite-role"
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
            {isSuperAdmin ? (
              <FormField
                description="Search by agency name. Inactive agencies can receive invitations, but access begins after reactivation."
                error={errors.agencyId?.message}
                id="invite-agency"
                label="Agency"
                required
              >
                <AgencyCombobox
                  ariaDescribedBy={
                    errors.agencyId
                      ? "invite-agency-error"
                      : "invite-agency-description"
                  }
                  id="invite-agency"
                  isInvalid={Boolean(errors.agencyId)}
                  onChange={(agency) => {
                    setSelectedAgency(agency);
                    setValue("agencyId", agency.id, { shouldValidate: true });
                    clearScope();
                  }}
                  value={selectedAgency}
                />
              </FormField>
            ) : (
              <p className="bg-muted rounded-lg border p-3 text-sm">
                Invitations are restricted to your agency
                {ownAgencyId ? ` (ID ${ownAgencyId})` : ""}.
              </p>
            )}
            {selectedAgency?.status === "inactive" && (
              <p className="bg-warning-soft text-warning rounded-lg border p-3 text-sm">
                This agency is inactive. The recipient may accept the
                invitation, but agency access starts only after the agency is
                reactivated.
              </p>
            )}
            <InvitationScopeSelectors
              agencyId={agencyId ?? 0}
              client={selectedClient}
              clientError={errors.clientId?.message}
              isClientUser={roleCode === "CLIENT_USER"}
              onClientChange={(client) => {
                setSelectedClient(client);
                setSelectedWorkspaces([]);
                setValue("clientId", client.id, { shouldValidate: true });
                setValue("workspaceIds", []);
              }}
              onWorkspacesChange={(workspaces) => {
                setSelectedWorkspaces(workspaces);
                setValue(
                  "workspaceIds",
                  workspaces.map((workspace) => workspace.id),
                  { shouldValidate: true },
                );
              }}
              workspaceError={errors.workspaceIds?.message}
              workspaces={selectedWorkspaces}
            />
            <div className="flex flex-wrap gap-3 border-t pt-5">
              <Button
                disabled={createMutation.isPending || currentUser.isPending}
                type="submit"
              >
                {createMutation.isPending ? (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Send aria-hidden className="size-4" />
                )}
                {createMutation.isPending
                  ? "Sending invitation..."
                  : "Send invitation"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={routes.users.index}>Back to users</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageStack>
  );
}
