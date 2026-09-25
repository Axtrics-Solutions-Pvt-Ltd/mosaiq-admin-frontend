"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
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
import { toast } from "@/components/ui/Toast";
import { clientDetailUrl, routes } from "@/config/routes";
import { useAgencies } from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
import type { ClientRecord } from "@/features/workspaces/contracts";
import { useClient } from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";

import { type ClientProfile, clientProfileSchema } from "./contracts";
import { useCreateClient, useUpdateClient } from "./queries";

function initialValues(record?: ClientRecord): ClientProfile {
  return {
    name: record?.name ?? "",
    status: record?.status ?? "active",
  };
}

function ClientForm({
  mode,
  agencyId,
  record,
}: {
  mode: "create" | "edit";
  agencyId: number;
  record?: ClientRecord;
}) {
  const router = useRouter();
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const [submitError, setSubmitError] = useState("");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ClientProfile>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: initialValues(record),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const backHref = record
    ? clientDetailUrl(record.id, agencyId)
    : routes.clients.index + `?agency=${agencyId}`;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  async function submit(values: ClientProfile) {
    setSubmitError("");
    try {
      if (mode === "create") {
        const saved = await createMutation.mutateAsync({
          agencyId,
          payload: values,
        });
        const defaultWorkspace = saved.workspaces?.[0];
        toast({
          title: "Client created",
          description: defaultWorkspace
            ? `Client created with a default workspace, ${defaultWorkspace.name}, in ${defaultWorkspace.currency}/${defaultWorkspace.timezone}.`
            : "Client created.",
          tone: "success",
        });
        router.push(clientDetailUrl(saved.id, agencyId));
      } else {
        const saved = await updateMutation.mutateAsync({
          agencyId,
          clientId: record!.id,
          payload: values,
        });
        router.push(clientDetailUrl(saved.id, agencyId));
      }
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of ["name", "status"] as const) {
          if (error.fieldErrors[field])
            setError(field, {
              type: "server",
              message: error.fieldErrors[field],
            });
        }
        setSubmitError(error.message);
      } else {
        setSubmitError("The client could not be saved. Please try again.");
      }
      document.getElementById("client-form-error")?.focus();
    }
  }

  return (
    <PageStack>
      <PageHeader
        breadcrumbs={
          <>
            <Link className="hover:text-primary" href={routes.clients.index}>
              Clients
            </Link>
            <span aria-hidden> / </span>
            <span>{mode === "create" ? "New client" : record?.name}</span>
          </>
        }
        description={
          mode === "create"
            ? "Create a client under this agency. A default workspace is created automatically."
            : "Update the client's name and status."
        }
        title={
          mode === "create"
            ? "Create client"
            : `Edit ${record?.name ?? "client"}`
        }
      />
      <form
        noValidate
        onSubmit={handleSubmit(submit, () => {
          setSubmitError("Review the highlighted fields.");
          document.getElementById("client-form-error")?.focus();
        })}
      >
        {submitError && (
          <div
            className="bg-destructive-soft text-destructive mb-4 flex gap-3 rounded-lg border p-4"
            id="client-form-error"
            role="alert"
            tabIndex={-1}
          >
            <AlertCircle aria-hidden className="size-5 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Client profile</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGrid>
              <FormField
                id="name"
                label="Client name"
                required
                error={errors.name?.message}
              >
                <Input
                  id="name"
                  placeholder="Northstar Client"
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
            </FormGrid>
          </CardContent>
        </Card>
        <div className="bg-card sticky bottom-0 z-10 mt-5 flex flex-col-reverse gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {isDirty
              ? "Unsaved changes"
              : "Changes are saved to the client after submission."}
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
            <Button disabled={isPending} type="submit">
              <Save aria-hidden className="size-4" />{" "}
              {isPending
                ? "Saving..."
                : mode === "create"
                  ? "Create client"
                  : "Save client"}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        body="Your unsaved edits will be discarded."
        confirmLabel="Discard changes"
        description="Your edits have not been saved."
        isOpen={isDiscarding}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={() => {
          setIsDiscarding(false);
          router.push(backHref);
        }}
        title="Discard changes?"
      />
    </PageStack>
  );
}

export function ClientCreateScreen({
  agencyId: requestedAgencyId,
}: {
  agencyId: number;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  // Only a Super Admin can list agencies; everyone else works in their own.
  const agencies = useAgencies({ page: 1 }, { enabled: isSuperAdmin });
  const agencyId =
    requestedAgencyId ||
    currentUser.data?.membership?.agencyId ||
    agencies.data?.data[0]?.id ||
    0;
  const canManage =
    isSuperAdmin ||
    (currentUser.data?.membership?.roleCode === "AGENCY_ADMIN" &&
      currentUser.data.membership.agencyId === agencyId);

  if (currentUser.isPending || (isSuperAdmin && agencies.isPending))
    return (
      <div aria-busy="true" className="p-8">
        Loading client setup...
      </div>
    );
  if (isSuperAdmin && agencies.isError)
    return (
      <StatePanel
        kind="error"
        title="Client setup unavailable"
        description="Agency choices could not be loaded."
        action={<Button onClick={() => agencies.refetch()}>Try again</Button>}
      />
    );
  if (!canManage)
    return (
      <StatePanel
        kind="permission"
        title="Client creation unavailable"
        description="You do not have permission to create a client in this agency."
      />
    );

  return (
    <PageStack>
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Client owner</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGrid>
              <FormField id="create-client-agency" label="Agency">
                <Select
                  id="create-client-agency"
                  value={agencyId || ""}
                  onChange={(event) =>
                    router.replace(
                      `${routes.clients.new}?agency=${event.target.value}`,
                    )
                  }
                >
                  <option value="">Select agency</option>
                  {agencies.data?.data.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.display_name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormGrid>
          </CardContent>
        </Card>
      )}
      {agencyId ? (
        <ClientForm key={agencyId} mode="create" agencyId={agencyId} />
      ) : (
        <StatePanel
          kind="empty"
          title="Choose an agency"
          description="A client must belong to an existing agency."
        />
      )}
    </PageStack>
  );
}

export function ClientEditScreen({
  agencyId,
  clientId,
}: {
  agencyId: number;
  clientId: number;
}) {
  const query = useClient(agencyId, clientId);
  const currentUser = useCurrentUser();
  if (
    !Number.isSafeInteger(agencyId) ||
    agencyId <= 0 ||
    !Number.isSafeInteger(clientId) ||
    clientId <= 0
  )
    return (
      <StatePanel
        kind="error"
        title="Client scope required"
        description="Open this client from the directory to edit it."
        action={
          <Button asChild>
            <Link href={routes.clients.index}>Open clients</Link>
          </Button>
        }
      />
    );
  if (query.isPending || currentUser.isPending)
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
  const canEdit =
    currentUser.data?.platformRoleCode === "SUPER_ADMIN" ||
    (currentUser.data?.membership?.roleCode === "AGENCY_ADMIN" &&
      currentUser.data.membership.agencyId === agencyId);
  if (!canEdit)
    return (
      <StatePanel
        kind="unavailable"
        title="Edit client unavailable"
        description="You do not have permission to edit this client."
      />
    );
  return (
    <ClientForm
      key={query.data.id}
      mode="edit"
      agencyId={agencyId}
      record={query.data}
    />
  );
}
