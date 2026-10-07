"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PageStack } from "@/components/shared/LayoutPatterns";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { routes } from "@/config/routes";
import { hasCapability } from "@/features/auth/contracts";
import { useCurrentUser } from "@/features/auth/queries";
import { ChannelBadge } from "@/features/channels/ChannelBadge";
import { useWorkspaces } from "@/features/workspaces/queries";
import { ApiError } from "@/lib/api/errors";

import type { ReportScope } from "./api";
import { CampaignAudiencesCard } from "./CampaignAudiencesCard";
import {
  type Audience,
  audienceCode,
  maxAudiences,
  type Report,
  type ReportProfileForm,
  reportProfileFormSchema,
} from "./contracts";
import {
  useReport,
  useUpdateReport,
  useUpdateReportWorkspaces,
} from "./queries";
import { workspaceIdsError } from "./ReportCreateScreen";
import { ReportPageHeader } from "./ReportPageHeader";
import { profileFieldNames, ReportProfileFields } from "./ReportProfileFields";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

function ProfileCard({
  report,
  scope,
}: {
  report: Report;
  scope: ReportScope;
}) {
  const mutation = useUpdateReport();
  const [formError, setFormError] = useState("");
  const form = useForm<ReportProfileForm>({
    resolver: zodResolver(reportProfileFormSchema),
    defaultValues: {
      name: report.name,
      status: report.status,
      default_range_preset: report.default_range_preset,
      currency: report.currency,
      timezone: report.timezone,
    },
  });
  useUnsavedChangesWarning(form.formState.isDirty);

  async function submit(values: ReportProfileForm) {
    setFormError("");
    try {
      const saved = await mutation.mutateAsync({ scope, payload: values });
      form.reset({
        name: saved.name,
        status: saved.status,
        default_range_preset: saved.default_range_preset,
        currency: saved.currency,
        timezone: saved.timezone,
      });
      toast({ title: "Report settings saved", tone: "success" });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("The settings could not be saved. Please try again.");
        return;
      }
      // A currency that differs from a source workspace comes back on
      // `currency` and shows beside that field.
      let isMapped = false;
      for (const field of profileFieldNames) {
        const message = error.fieldErrors[field];
        if (message) {
          form.setError(field, { type: "server", message });
          isMapped = true;
        }
      }
      setFormError(isMapped ? "Review the highlighted fields." : error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          aria-label="Report profile"
          className="space-y-5"
          noValidate
          onSubmit={form.handleSubmit(submit)}
        >
          {formError && (
            <p
              className="text-destructive rounded-lg border p-3 text-sm"
              role="alert"
            >
              {formError}
            </p>
          )}
          <ReportProfileFields
            extraCurrencies={[
              report.currency,
              ...report.workspaces.map((workspace) => workspace.currency),
            ]}
            extraTimezones={[report.timezone]}
            form={form}
            mode="edit"
          />
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            {form.formState.isDirty && (
              <span className="text-muted-foreground text-xs">
                Unsaved changes
              </span>
            )}
            <Button
              disabled={mutation.isPending || !form.formState.isDirty}
              type="submit"
            >
              {mutation.isPending ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// The report lists a source's channel without its category, so its badge
// uses the generic icon until the workspace list supplies one.
type Source = {
  id: number;
  name: string;
  currency: string;
  channel: { name: string; category: string } | null;
};

function SourcesCard({
  report,
  scope,
}: {
  report: Report;
  scope: ReportScope;
}) {
  const mutation = useUpdateReportWorkspaces();
  const available = useWorkspaces(scope.agencyId, scope.clientId, {
    per_page: 100,
  });
  const initial: Source[] = [...report.workspaces]
    .sort((a, b) => a.position - b.position)
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      currency: workspace.currency,
      channel: workspace.channel
        ? { name: workspace.channel.name, category: "" }
        : null,
    }));
  const [sources, setSources] = useState<Source[]>(initial);
  const [toAdd, setToAdd] = useState("");
  const [error, setError] = useState<string>();
  const isDirty =
    sources.map((source) => source.id).join(",") !==
    initial.map((source) => source.id).join(",");
  useUnsavedChangesWarning(isDirty);
  const candidates = (available.data?.data ?? []).filter(
    (workspace) => !sources.some((source) => source.id === workspace.id),
  );

  function move(index: number, offset: -1 | 1) {
    setSources((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(index + offset, 0, moved!);
      return next;
    });
  }

  function add() {
    const workspace = candidates.find((entry) => entry.id === Number(toAdd));
    if (!workspace) return;
    setSources((current) => [
      ...current,
      {
        id: workspace.id,
        name: workspace.name,
        currency: workspace.currency,
        channel: workspace.connector,
      },
    ]);
    setToAdd("");
  }

  async function save() {
    setError(undefined);
    try {
      await mutation.mutateAsync({
        scope,
        workspaceIds: sources.map((source) => source.id),
      });
      toast({ title: "Source channels saved", tone: "success" });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (workspaceIdsError(caught.fieldErrors) ?? caught.message)
          : "The source channels could not be saved. Please try again.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source channels</CardTitle>
        <p className="text-muted-foreground text-sm">
          The report combines these channels, in this order. Each must use the
          report currency ({report.currency}).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p
            className="text-destructive rounded-lg border p-3 text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
        {sources.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No source channels. Live widgets show no data until you add one.
          </p>
        ) : (
          <ol className="space-y-2">
            {sources.map((source, index) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                key={source.id}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-strong font-medium">{source.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <ChannelBadge channel={source.channel} />
                    <span
                      className={
                        source.currency === report.currency
                          ? "text-muted-foreground"
                          : "text-warning font-medium"
                      }
                    >
                      {source.currency}
                      {source.currency !== report.currency &&
                        " — differs from the report currency"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    aria-label={`Move ${source.name} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    size="icon"
                    variant="ghost"
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Move ${source.name} down`}
                    disabled={index === sources.length - 1}
                    onClick={() => move(index, 1)}
                    size="icon"
                    variant="ghost"
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Remove ${source.name}`}
                    onClick={() =>
                      setSources((current) =>
                        current.filter((entry) => entry.id !== source.id),
                      )
                    }
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-60 flex-1">
            <FormField id="report-add-source" label="Add a channel">
              <Select
                disabled={!available.isSuccess || candidates.length === 0}
                id="report-add-source"
                onChange={(event) => setToAdd(event.target.value)}
                value={toAdd}
              >
                <option value="">
                  {available.isPending
                    ? "Loading channels..."
                    : available.isError
                      ? "Channels could not be loaded"
                      : candidates.length === 0
                        ? "No other channels"
                        : "Select a channel"}
                </option>
                {candidates.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                    {workspace.connector
                      ? ` (${workspace.connector.name})`
                      : ""}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <Button
            disabled={!toAdd}
            onClick={add}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden className="size-4" /> Add
          </Button>
        </div>
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {isDirty && (
            <span className="text-muted-foreground text-xs">
              Unsaved changes
            </span>
          )}
          <Button
            disabled={mutation.isPending || !isDirty}
            onClick={save}
            type="button"
          >
            {mutation.isPending ? "Saving..." : "Save sources"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Problems the API would refuse, found before saving.
function audiencesProblem(audiences: readonly Audience[]) {
  const labels = audiences.map((audience) => audience.label.trim());
  if (labels.some((label) => label === ""))
    return "Give every audience a name.";
  if (labels.some((label) => label.length > 60))
    return "Keep audience names to 60 characters.";
  const lower = labels.map((label) => label.toLowerCase());
  if (lower.some((label, index) => lower.indexOf(label) !== index))
    return "Each audience needs its own name.";
  return undefined;
}

// The audience segments viewers can filter the report by. A new audience gets
// its code from its name; renaming keeps the code, so rows and campaigns
// tagged with it stay tagged.
function AudiencesCard({
  report,
  scope,
}: {
  report: Report;
  scope: ReportScope;
}) {
  const mutation = useUpdateReport();
  const [audiences, setAudiences] = useState<Audience[]>(report.audiences);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string>();
  const isDirty =
    JSON.stringify(audiences) !== JSON.stringify(report.audiences);
  useUnsavedChangesWarning(isDirty);

  function move(index: number, offset: -1 | 1) {
    setAudiences((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(index + offset, 0, moved!);
      return next;
    });
  }

  function rename(code: string, label: string) {
    setAudiences((current) =>
      current.map((audience) =>
        audience.code === code ? { ...audience, label } : audience,
      ),
    );
  }

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    setAudiences((current) => [
      ...current,
      {
        code: audienceCode(
          label,
          current.map((audience) => audience.code),
        ),
        label,
      },
    ]);
    setNewLabel("");
  }

  async function save() {
    const problem = audiencesProblem(audiences);
    setError(problem);
    if (problem) return;
    try {
      const saved = await mutation.mutateAsync({
        scope,
        payload: {
          audiences: audiences.map((audience) => ({
            code: audience.code,
            label: audience.label.trim(),
          })),
        },
      });
      setAudiences(saved.audiences);
      toast({ title: "Audience segments saved", tone: "success" });
    } catch (caught) {
      // An audience still tagged on a widget, channel or campaign can't be
      // removed; the API says where it is used.
      setError(
        caught instanceof ApiError
          ? (Object.entries(caught.fieldErrors).find(([key]) =>
              key.startsWith("audiences"),
            )?.[1] ?? caught.message)
          : "The audience segments could not be saved. Please try again.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience segments</CardTitle>
        <p className="text-muted-foreground text-sm">
          Viewers can filter the Reporting Dashboard and Marketing Intelligence
          by these audiences. Give campaigns an audience below, and tag rows
          with one in Marketing Intelligence and Reporting content widgets.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p
            className="text-destructive rounded-lg border p-3 text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
        {audiences.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No audiences. The portal shows no audience filter.
          </p>
        ) : (
          <ol className="space-y-2">
            {audiences.map((audience, index) => (
              <li
                className="flex flex-wrap items-end justify-between gap-3 rounded-lg border p-3"
                key={audience.code}
              >
                <div className="min-w-60 flex-1">
                  <FormField
                    id={`report-audience-${audience.code}`}
                    label={`Audience ${index + 1}`}
                  >
                    <Input
                      autoComplete="off"
                      id={`report-audience-${audience.code}`}
                      maxLength={60}
                      onChange={(event) =>
                        rename(audience.code, event.target.value)
                      }
                      value={audience.label}
                    />
                  </FormField>
                </div>
                <div className="flex gap-1">
                  <Button
                    aria-label={`Move ${audience.label} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    size="icon"
                    variant="ghost"
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Move ${audience.label} down`}
                    disabled={index === audiences.length - 1}
                    onClick={() => move(index, 1)}
                    size="icon"
                    variant="ghost"
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Remove ${audience.label}`}
                    onClick={() =>
                      setAudiences((current) =>
                        current.filter((entry) => entry.code !== audience.code),
                      )
                    }
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-60 flex-1">
            <FormField id="report-add-audience" label="Add an audience">
              <Input
                autoComplete="off"
                disabled={audiences.length >= maxAudiences}
                id="report-add-audience"
                maxLength={60}
                onChange={(event) => setNewLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    add();
                  }
                }}
                placeholder={
                  audiences.length >= maxAudiences
                    ? `Up to ${maxAudiences} audiences`
                    : "e.g. South Asian"
                }
                value={newLabel}
              />
            </FormField>
          </div>
          <Button
            disabled={!newLabel.trim() || audiences.length >= maxAudiences}
            onClick={add}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden className="size-4" /> Add
          </Button>
        </div>
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {isDirty && (
            <span className="text-muted-foreground text-xs">
              Unsaved changes
            </span>
          )}
          <Button
            disabled={mutation.isPending || !isDirty}
            onClick={save}
            type="button"
          >
            {mutation.isPending ? "Saving..." : "Save audiences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportSettingsScreen({
  agencyId,
  clientId,
  reportId,
}: {
  agencyId: number;
  clientId: number;
  reportId: number;
}) {
  const scope = { agencyId, clientId, reportId };
  const user = useCurrentUser();
  const report = useReport(scope);
  if (
    ![agencyId, clientId, reportId].every(
      (id) => Number.isSafeInteger(id) && id > 0,
    )
  )
    return (
      <StatePanel
        action={
          <Button asChild>
            <Link href={routes.reports.index}>Open reports</Link>
          </Button>
        }
        description="Open this report from the reports list."
        kind="error"
        title="Report scope required"
      />
    );
  if (user.isPending || report.isPending)
    return <p aria-busy="true">Loading report...</p>;
  if (!(user.data && hasCapability(user.data, "reports.manage")))
    return (
      <StatePanel
        description="You do not have permission to change reports."
        kind="permission"
        title="Report settings unavailable"
      />
    );
  if (report.isError)
    return (
      <StatePanel
        action={<Button onClick={() => report.refetch()}>Try again</Button>}
        description="The report could not be loaded."
        kind="error"
        title="Report unavailable"
      />
    );
  return (
    <PageStack>
      <ReportPageHeader
        current="settings"
        description="The report's name, status, default range, currency and time zone, the channels it combines, and the audiences viewers can filter by."
        report={report.data}
      />
      <ProfileCard key={report.data.id} report={report.data} scope={scope} />
      <SourcesCard
        key={report.data.workspaces.map((workspace) => workspace.id).join(",")}
        report={report.data}
        scope={scope}
      />
      <AudiencesCard
        key={report.data.audiences.map((audience) => audience.code).join(",")}
        report={report.data}
        scope={scope}
      />
      <CampaignAudiencesCard report={report.data} scope={scope} />
    </PageStack>
  );
}
