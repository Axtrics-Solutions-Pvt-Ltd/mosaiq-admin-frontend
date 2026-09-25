"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { FormGrid, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  newReportUrl,
  reportsIndexUrl,
  reportUrl,
  routes,
  workspaceScope,
} from "@/config/routes";
import { useAgency } from "@/features/agencies/queries";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ChannelBadge } from "@/features/channels/ChannelBadge";
import type { WorkspaceRecord } from "@/features/workspaces/contracts";
import { useWorkspaces } from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";

import { type ReportProfileForm, reportProfileFormSchema } from "./contracts";
import { useCreateReport } from "./queries";
import { ReportOwnerFields, useReportOwner } from "./ReportOwner";
import { profileFieldNames, ReportProfileFields } from "./ReportProfileFields";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

// The first workspace error the API returns for the sources, whether it is on
// the list or on one entry (`workspace_ids.2`).
export function workspaceIdsError(fieldErrors: Record<string, string>) {
  const key = Object.keys(fieldErrors).find(
    (field) => field === "workspace_ids" || field.startsWith("workspace_ids."),
  );
  return key ? fieldErrors[key] : undefined;
}

export function SourceWorkspaceOption({
  currency,
  isChecked,
  onToggle,
  workspace,
}: {
  currency: string;
  isChecked: boolean;
  onToggle: (isChecked: boolean) => void;
  workspace: WorkspaceRecord;
}) {
  const id = `source-${workspace.id}`;
  const isOtherCurrency = workspace.currency !== currency;
  return (
    <li className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox
        aria-describedby={`${id}-details`}
        checked={isChecked}
        className="mt-0.5"
        id={id}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <label className="text-strong block font-medium" htmlFor={id}>
          {workspace.name}
        </label>
        <div
          className="flex flex-wrap items-center gap-2 text-xs"
          id={`${id}-details`}
        >
          <ChannelBadge channel={workspace.connector} />
          {workspace.status === "inactive" && <StatusBadge status="inactive" />}
          <span
            className={
              isOtherCurrency
                ? "text-warning font-medium"
                : "text-muted-foreground"
            }
          >
            {workspace.currency}
            {isOtherCurrency && ` — differs from the report currency`}
          </span>
        </div>
      </div>
    </li>
  );
}

function ReportCreateForm({
  agencyId,
  clientId,
  clientName,
  defaults,
}: {
  agencyId: number;
  clientId: number;
  clientName: string;
  defaults: { currency: string; timezone: string };
}) {
  const router = useRouter();
  const mutation = useCreateReport();
  const workspaces = useWorkspaces(agencyId, clientId, { per_page: 100 });
  const [workspaceIds, setWorkspaceIds] = useState<readonly number[]>([]);
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [submitError, setSubmitError] = useState("");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const form = useForm<ReportProfileForm>({
    resolver: zodResolver(reportProfileFormSchema),
    defaultValues: {
      name: "",
      status: "active",
      default_range_preset: "last_30_days",
      currency: defaults.currency,
      timezone: defaults.timezone,
    },
  });
  const isDirty = form.formState.isDirty || workspaceIds.length > 0;
  useUnsavedChangesWarning(isDirty);
  const currency = useWatch({ control: form.control, name: "currency" });
  const records = workspaces.data?.data ?? [];
  const backHref = reportsIndexUrl(agencyId, clientId);

  function toggle(workspaceId: number, isChecked: boolean) {
    setWorkspaceError(undefined);
    // Sources keep the order they were ticked in; settings can reorder them.
    setWorkspaceIds((current) =>
      isChecked
        ? [...current, workspaceId]
        : current.filter((id) => id !== workspaceId),
    );
  }

  async function submit(values: ReportProfileForm) {
    setSubmitError("");
    try {
      const report = await mutation.mutateAsync({
        agencyId,
        clientId,
        payload: {
          name: values.name,
          default_range_preset: values.default_range_preset,
          currency: values.currency,
          timezone: values.timezone,
          workspace_ids: [...workspaceIds],
        },
      });
      router.push(reportUrl(report.id, agencyId, clientId));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setSubmitError("The report could not be created. Please try again.");
        return;
      }
      for (const field of profileFieldNames) {
        const message = error.fieldErrors[field];
        if (message) form.setError(field, { type: "server", message });
      }
      setWorkspaceError(workspaceIdsError(error.fieldErrors));
      setSubmitError(error.message);
      document.getElementById("report-form-error")?.focus();
    }
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit, () => {
        setSubmitError("Review the highlighted fields.");
        document.getElementById("report-form-error")?.focus();
      })}
    >
      <PageStack>
        {submitError && (
          <p
            className="text-destructive rounded-lg border p-4"
            id="report-form-error"
            role="alert"
            tabIndex={-1}
          >
            {submitError}
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Report profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportProfileFields
              extraCurrencies={[
                defaults.currency,
                ...records.map((workspace) => workspace.currency),
              ]}
              extraTimezones={[defaults.timezone]}
              form={form}
              mode="create"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Source workspaces</CardTitle>
            <p className="text-muted-foreground text-sm">
              The report combines data from the channel workspaces of{" "}
              {clientName} you choose here.
            </p>
          </CardHeader>
          <CardContent>
            <fieldset
              aria-describedby={
                workspaceError ? "report-sources-error" : undefined
              }
            >
              <legend className="sr-only">Source workspaces</legend>
              {workspaceError && (
                <p
                  className="text-destructive mb-3 text-sm font-medium"
                  id="report-sources-error"
                  role="alert"
                >
                  {workspaceError}
                </p>
              )}
              {workspaces.isPending && (
                <p aria-busy="true">Loading workspaces...</p>
              )}
              {workspaces.isError && (
                <StatePanel
                  action={
                    <Button onClick={() => workspaces.refetch()} type="button">
                      Try again
                    </Button>
                  }
                  description="The client's workspaces could not be loaded."
                  kind="error"
                  title="Workspaces unavailable"
                />
              )}
              {workspaces.isSuccess && records.length === 0 && (
                <StatePanel
                  action={
                    <Button asChild variant="outline">
                      <Link
                        href={
                          routes.workspaces.new +
                          workspaceScope(agencyId, clientId)
                        }
                      >
                        <Plus aria-hidden className="size-4" /> Add channel
                        workspace
                      </Link>
                    </Button>
                  }
                  description="You can create the report now and add sources later in its settings."
                  kind="empty"
                  title="No workspaces you can use"
                />
              )}
              {records.length > 0 && (
                <ul className="grid gap-3 md:grid-cols-2">
                  {records.map((workspace) => (
                    <SourceWorkspaceOption
                      currency={currency}
                      isChecked={workspaceIds.includes(workspace.id)}
                      key={workspace.id}
                      onToggle={(isChecked) => toggle(workspace.id, isChecked)}
                      workspace={workspace}
                    />
                  ))}
                </ul>
              )}
            </fieldset>
          </CardContent>
        </Card>
        <div className="bg-card sticky bottom-0 z-10 flex flex-col-reverse gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {workspaceIds.length === 1
              ? "1 source workspace selected"
              : `${workspaceIds.length} source workspaces selected`}
          </p>
          <div className="flex gap-2">
            {isDirty ? (
              <Button
                onClick={() => setIsDiscarding(true)}
                type="button"
                variant="outline"
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
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Creating..." : "Create report"}
            </Button>
          </div>
        </div>
      </PageStack>
      <ConfirmationDialog
        body={<p>The new report has not been created.</p>}
        confirmLabel="Discard report"
        description="Your entries will be lost."
        isOpen={isDiscarding}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={() => router.push(backHref)}
        title="Discard this report?"
      />
    </form>
  );
}

export function ReportCreateScreen({
  agencyId: requestedAgencyId,
  clientId: requestedClientId,
}: {
  agencyId: number;
  clientId: number;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const owner = useReportOwner(requestedAgencyId, requestedClientId);
  const agency = useAgency(owner.agencyId);
  const canManage = Boolean(
    user.data && hasCapability(user.data, "reports.manage"),
  );

  const header = (
    <PageHeader
      breadcrumbs={
        <Link
          className="hover:text-primary"
          href={
            owner.clientId
              ? reportsIndexUrl(owner.agencyId, owner.clientId)
              : routes.reports.index
          }
        >
          Reports
        </Link>
      }
      description="Choose the client and the channel workspaces the report combines. You design its layout next."
      title="New report"
    />
  );

  if (owner.isPending || (owner.agencyId > 0 && agency.isPending))
    return <p aria-busy="true">Loading report setup...</p>;
  if (!canManage)
    return (
      <StatePanel
        description="You do not have permission to create reports."
        kind="permission"
        title="Report creation unavailable"
      />
    );
  if (owner.isError || agency.isError)
    return (
      <StatePanel
        action={
          <Button
            onClick={() => {
              owner.refetch();
              void agency.refetch();
            }}
          >
            Try again
          </Button>
        }
        description="The agency or its clients could not be loaded."
        kind="error"
        title="Report setup unavailable"
      />
    );

  return (
    <PageStack>
      {header}
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent>
          <FormGrid>
            <ReportOwnerFields
              idPrefix="new-report"
              onChange={(agencyId, clientId) =>
                router.replace(newReportUrl(agencyId, clientId))
              }
              owner={owner}
            />
          </FormGrid>
        </CardContent>
      </Card>
      {owner.client && agency.data ? (
        <ReportCreateForm
          agencyId={owner.agencyId}
          clientId={owner.client.id}
          clientName={owner.client.name}
          defaults={{
            currency: agency.data.defaults.currency,
            timezone: agency.data.defaults.time_zone,
          }}
          key={`${owner.agencyId}-${owner.client.id}`}
        />
      ) : (
        <StatePanel
          description={
            owner.agencyId
              ? "Reports belong to a client. Add a client first, or ask an Agency Admin for access to one."
              : "Choose an agency first."
          }
          kind="empty"
          title="Choose a client"
        />
      )}
    </PageStack>
  );
}
