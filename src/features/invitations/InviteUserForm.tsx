"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
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
import { routes } from "@/config/routes";
import { useCurrentUser } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";

import { invitationRoles, inviteSchema } from "./contracts";
import { useCreateInvitation } from "./queries";

const formSchema = z.object({
  agencyId: z.string(),
  email: z.email("Enter a valid email address."),
  roleCode: z.enum(invitationRoles),
  clientId: z.string(),
  workspaceIds: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

const roles = [
  { code: "AGENCY_ADMIN", label: "Agency Admin" },
  { code: "MANAGER", label: "Manager" },
  { code: "ANALYST", label: "Analyst" },
  { code: "VIEWER", label: "Viewer" },
  { code: "CLIENT_USER", label: "Client User" },
] as const;

function positiveId(value: string) {
  const number = Number(value.trim());
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export function InviteUserForm() {
  const currentUser = useCurrentUser();
  const createMutation = useCreateInvitation();
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | undefined
  >();
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  const ownAgencyId = currentUser.data?.membership?.agencyId;
  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyId: "",
      email: "",
      roleCode: "VIEWER",
      clientId: "",
      workspaceIds: "",
    },
  });
  const roleCode = useWatch({ control, name: "roleCode" });
  const onSubmit = handleSubmit(async (values) => {
    setMessage(undefined);
    const agencyId = isSuperAdmin ? positiveId(values.agencyId) : ownAgencyId;
    if (!agencyId) {
      setError("agencyId", { message: "Enter a valid agency ID." });
      return;
    }
    const clientId = values.clientId.trim()
      ? positiveId(values.clientId)
      : undefined;
    if (values.clientId.trim() && !clientId) {
      setError("clientId", { message: "Enter a valid client ID." });
      return;
    }
    const workspaceParts = values.workspaceIds
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const workspaceIds = workspaceParts.map(positiveId);
    if (workspaceIds.some((id) => id === undefined)) {
      setError("workspaceIds", {
        message: "Enter workspace IDs separated by commas.",
      });
      return;
    }
    const parsed = inviteSchema.safeParse({
      email: values.email.trim(),
      role_code: values.roleCode,
      ...(clientId ? { client_id: clientId } : {}),
      workspace_ids: workspaceIds,
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
      await createMutation.mutateAsync({ agencyId, payload: parsed.data });
      setMessage({
        kind: "success",
        text: `Invitation emailed to ${parsed.data.email}.`,
      });
      reset({ ...values, email: "", clientId: "", workspaceIds: "" });
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
        setMessage({ kind: "error", text: error.message });
      } else {
        setMessage({
          kind: "error",
          text: "The invitation could not be sent. Please try again.",
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
          {message && (
            <p
              className={
                message.kind === "success"
                  ? "bg-success-soft text-success mb-5 rounded-lg border p-3"
                  : "bg-destructive-soft text-destructive mb-5 rounded-lg border p-3"
              }
              role={message.kind === "success" ? "status" : "alert"}
            >
              {message.text}
            </p>
          )}
          <form className="space-y-5" noValidate onSubmit={onSubmit}>
            <FormField
              error={errors.email?.message}
              id="invite-email"
              label="Email"
              required
            >
              <Input
                aria-invalid={Boolean(errors.email)}
                id="invite-email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
            </FormField>
            <FormField
              error={errors.roleCode?.message}
              id="invite-role"
              label="Role"
              required
            >
              <Select id="invite-role" {...register("roleCode")}>
                {roles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {isSuperAdmin ? (
              <FormField
                description="Use the numeric agency ID from the Admin API. Agency selection will be added when a lookup endpoint is available."
                error={errors.agencyId?.message}
                id="invite-agency"
                label="Agency ID"
                required
              >
                <Input
                  id="invite-agency"
                  inputMode="numeric"
                  {...register("agencyId")}
                />
              </FormField>
            ) : (
              <p className="bg-muted rounded-lg border p-3 text-sm">
                Invitations are restricted to your agency
                {ownAgencyId ? ` (ID ${ownAgencyId})` : ""}.
              </p>
            )}
            <FormField
              description={
                roleCode === "CLIENT_USER"
                  ? "Required. Use a client ID from the selected agency."
                  : "Optional when access should be limited to a client."
              }
              error={errors.clientId?.message}
              id="invite-client"
              label="Client ID"
              required={roleCode === "CLIENT_USER"}
            >
              <Input
                id="invite-client"
                inputMode="numeric"
                {...register("clientId")}
              />
            </FormField>
            <FormField
              description="Enter numeric workspace IDs separated by commas. For Client User, every workspace must belong to the selected client; the API validates this relationship."
              error={errors.workspaceIds?.message}
              id="invite-workspaces"
              label="Workspace IDs"
              required={roleCode === "CLIENT_USER"}
            >
              <Input id="invite-workspaces" {...register("workspaceIds")} />
            </FormField>
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
