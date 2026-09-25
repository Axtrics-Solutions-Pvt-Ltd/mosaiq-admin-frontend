"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CloudDownload,
  Info,
  KeyRound,
  Pencil,
  Save,
  Unplug,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { StatePanel } from "@/components/shared/StatePanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { workspaceEditUrl } from "@/config/routes";
import { useChannels } from "@/features/channels/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime, formatNumber } from "@/lib/formatters";

import {
  type ConnectionField,
  toConnectionFields,
  toCredentialValues,
} from "./connection";
import type { WorkspaceFetchResult, WorkspaceRecord } from "./contracts";
import {
  useDisconnectWorkspace,
  useFetchWorkspaceData,
  useSaveWorkspaceCredentials,
  useWorkspaceCredentials,
} from "./queries";

type CredentialFormValues = { values: string[] };

function credentialFormSchema(fields: readonly ConnectionField[]) {
  return z.object({
    values: z.array(z.string()).superRefine((values, context) => {
      fields.forEach((field, index) => {
        if (field.isRequired && !field.isSet && !values[index]?.trim())
          context.addIssue({
            code: "custom",
            path: [index],
            message: `Enter ${field.label}.`,
          });
      });
    }),
  });
}

function StoredValue({
  field,
  onReplace,
  canEdit,
}: {
  field: ConnectionField;
  onReplace: () => void;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="bg-muted text-strong rounded-sm border px-3 py-2 font-mono text-sm"
        id={`credential-${field.key}-stored`}
      >
        {field.hint ?? "••••••••"}
      </span>
      {canEdit && (
        <Button
          aria-label={`Replace ${field.label}`}
          onClick={onReplace}
          size="sm"
          type="button"
          variant="outline"
        >
          <Pencil aria-hidden className="size-4" /> Replace
        </Button>
      )}
    </div>
  );
}

function CredentialsForm({
  fields,
  scope,
  canEdit,
}: {
  fields: readonly ConnectionField[];
  scope: { agencyId: number; clientId: number; workspaceId: number };
  canEdit: boolean;
}) {
  const mutation = useSaveWorkspaceCredentials(scope);
  const [replacing, setReplacing] = useState<ReadonlySet<string>>(new Set());
  const [submitError, setSubmitError] = useState("");
  const schema = useMemo(() => credentialFormSchema(fields), [fields]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<CredentialFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { values: fields.map(() => "") },
  });
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  async function submit({ values }: CredentialFormValues) {
    setSubmitError("");
    try {
      await mutation.mutateAsync({
        values: toCredentialValues(fields, values),
      });
      reset({ values: fields.map(() => "") });
      setReplacing(new Set());
      toast({
        title: "Credentials saved",
        description: "The workspace connection details were saved.",
        tone: "success",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        fields.forEach((field, index) => {
          const message =
            error.fieldErrors[`values.${field.key}`] ??
            error.fieldErrors[field.key];
          if (message) setError(`values.${index}`, { type: "server", message });
        });
        setSubmitError(error.message);
      } else
        setSubmitError("The credentials could not be saved. Please try again.");
    }
  }

  if (fields.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        This channel needs no credentials.
      </p>
    );
  return (
    <form
      aria-label="Connection credentials"
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      {submitError && (
        <p
          className="text-destructive rounded-lg border p-3 text-sm"
          role="alert"
        >
          {submitError}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field, index) => {
          const id = `credential-${field.key}`;
          const error = errors.values?.[index]?.message;
          const showInput =
            canEdit && (!field.isSet || replacing.has(field.key));
          const description =
            field.isSet && showInput
              ? "Leave empty to keep the stored value."
              : (field.help ?? undefined);
          return (
            <FormField
              description={description}
              error={error}
              id={showInput ? id : `${id}-stored`}
              key={field.key}
              label={field.label}
              required={field.isRequired}
            >
              {!showInput ? (
                <StoredValue
                  canEdit={canEdit}
                  field={field}
                  onReplace={() =>
                    setReplacing((current) => new Set(current).add(field.key))
                  }
                />
              ) : field.type === "select" ? (
                <Select
                  aria-invalid={Boolean(error)}
                  id={id}
                  {...register(`values.${index}`)}
                >
                  <option value="">
                    {field.isSet ? "Keep current value" : "Select an option"}
                  </option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete="off"
                  id={id}
                  spellCheck={false}
                  type={field.type === "secret" ? "password" : "text"}
                  {...register(`values.${index}`)}
                />
              )}
            </FormField>
          );
        })}
      </div>
      {canEdit && (
        <Button disabled={mutation.isPending} type="submit">
          <Save aria-hidden className="size-4" />
          {mutation.isPending ? "Saving..." : "Save credentials"}
        </Button>
      )}
    </form>
  );
}

export function ConnectionCard({
  workspace,
  canManage,
}: {
  workspace: WorkspaceRecord;
  canManage: boolean;
}) {
  const scope = {
    agencyId: workspace.agency_id,
    clientId: workspace.client_id,
    workspaceId: workspace.id,
  };
  const channel = workspace.connector;
  const credentials = useWorkspaceCredentials(scope, {
    enabled: Boolean(channel),
  });
  const channels = useChannels({ enabled: Boolean(channel) });
  const disconnect = useDisconnectWorkspace(scope);
  const fetchData = useFetchWorkspaceData(scope);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [lastFetch, setLastFetch] = useState<WorkspaceFetchResult>();
  const [actionError, setActionError] = useState("");

  if (!channel)
    return (
      <StatePanel
        action={
          canManage ? (
            <Button asChild variant="outline">
              <Link
                href={workspaceEditUrl(
                  workspace.id,
                  workspace.agency_id,
                  workspace.client_id,
                )}
              >
                Choose a channel
              </Link>
            </Button>
          ) : undefined
        }
        description="This workspace was created before channels. Choose its channel before connecting it."
        kind="unavailable"
        title="No channel assigned"
      />
    );

  const definitions =
    channels.data?.find((entry) => entry.id === channel.id)
      ?.credential_fields ?? [];
  const fields = credentials.data
    ? toConnectionFields(credentials.data.fields, definitions)
    : [];
  const status = credentials.data?.status ?? "not_connected";
  const isConnected = status === "connected";
  // Phase 1 fetches generate sample rows; only a fetch that says otherwise
  // hides the notice.
  const isSample = lastFetch?.is_sample ?? true;

  async function runFetch() {
    setActionError("");
    setLastFetch(undefined);
    try {
      setLastFetch(await fetchData.mutateAsync());
    } catch (error) {
      setActionError(
        error instanceof ApiError && error.status === 422
          ? "Data can only be fetched for a connected workspace. Check the credentials and try again."
          : "The data fetch failed. Please try again.",
      );
    }
  }

  async function confirmDisconnect() {
    setActionError("");
    try {
      await disconnect.mutateAsync();
      setIsDisconnecting(false);
      setLastFetch(undefined);
      toast({
        title: "Workspace disconnected",
        description: "The stored credentials were removed.",
        tone: "success",
      });
    } catch {
      setIsDisconnecting(false);
      setActionError(
        "The workspace could not be disconnected. Please try again.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound aria-hidden className="text-primary size-5" />
            <CardTitle>Connection</CardTitle>
          </div>
          {credentials.isSuccess && <StatusBadge status={status} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isSample && (
          <div
            className="bg-info-soft text-info flex items-start gap-2 rounded-lg border border-sky-200 p-3 text-sm"
            role="note"
          >
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>Sample data:</strong> live connection to {channel.name}{" "}
              comes in a later phase.
            </p>
          </div>
        )}
        {credentials.isPending && (
          <div
            aria-busy="true"
            aria-label="Loading connection"
            className="space-y-3"
          >
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {credentials.isError && (
          <StatePanel
            action={
              <Button onClick={() => credentials.refetch()}>Try again</Button>
            }
            description="The connection details could not be loaded."
            kind="error"
            title="Connection unavailable"
          />
        )}
        {credentials.isSuccess && (
          <>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">Channel</dt>
                <dd className="text-strong mt-1 font-medium">{channel.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Last fetched</dt>
                <dd className="text-strong mt-1 font-medium">
                  {credentials.data.last_fetched_at
                    ? formatDateTime(credentials.data.last_fetched_at)
                    : "Never"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  Last fetch result
                </dt>
                <dd className="text-strong mt-1 font-medium">
                  {credentials.data.last_fetch_status ?? "None"}
                </dd>
              </div>
            </dl>
            {credentials.data.last_fetch_error && (
              <div
                className="text-destructive rounded-lg border border-red-200 p-3 text-sm"
                role="alert"
              >
                <p className="font-medium">Last error</p>
                <p className="mt-1">{credentials.data.last_fetch_error}</p>
              </div>
            )}
            <CredentialsForm
              canEdit={canManage}
              fields={fields}
              // Start a fresh form only when the stored fields change, so a
              // background refetch does not clear what is being typed.
              key={fields
                .map((field) => [field.key, field.isSet, field.hint].join(":"))
                .join("|")}
              scope={scope}
            />
            {actionError && (
              <p className="text-destructive text-sm" role="alert">
                {actionError}
              </p>
            )}
            <p
              aria-live="polite"
              className="text-success text-sm"
              role="status"
            >
              {lastFetch &&
                `${formatNumber(lastFetch.rows_upserted)} rows updated for ${formatDate(lastFetch.date_from)}–${formatDate(lastFetch.date_to)}.`}
            </p>
            {canManage && (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                  aria-busy={fetchData.isPending}
                  disabled={!isConnected || fetchData.isPending}
                  onClick={runFetch}
                  variant="secondary"
                >
                  <CloudDownload aria-hidden className="size-4" />
                  {fetchData.isPending ? "Fetching data..." : "Fetch data"}
                </Button>
                {status !== "not_connected" && (
                  <Button
                    onClick={() => setIsDisconnecting(true)}
                    variant="outline"
                  >
                    <Unplug aria-hidden className="size-4" /> Disconnect
                  </Button>
                )}
                {!isConnected && (
                  <p className="text-muted-foreground self-center text-xs">
                    Save the credentials to connect before fetching data.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
      <ConfirmationDialog
        body={
          <p>
            The stored credentials for {workspace.name} are removed and the
            workspace stops fetching {channel.name} data. Data already fetched
            is kept.
          </p>
        }
        confirmLabel="Disconnect"
        description="The credentials will need to be entered again to reconnect."
        isOpen={isDisconnecting}
        isPending={disconnect.isPending}
        onCancel={() => setIsDisconnecting(false)}
        onConfirm={confirmDisconnect}
        title={`Disconnect ${channel.name}?`}
      />
    </Card>
  );
}
