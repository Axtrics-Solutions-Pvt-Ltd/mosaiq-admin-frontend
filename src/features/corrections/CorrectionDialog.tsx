"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toast";
import type { MetricCode } from "@/features/channels/contracts";
import { ApiError } from "@/lib/api/errors";
import { formatDateRange } from "@/lib/formatters";

import {
  type CorrectionFormOutput,
  correctionFormSchema,
  type CorrectionFormValues,
  isIntegerMetric,
} from "./contracts";
import { formatMetricValue, type MetricFormat } from "./format";
import { useCreateCorrection } from "./queries";

// Only base metrics are typed here: a calculated metric can't open the dialog.
export type CorrectionContext = {
  agencyId: number;
  clientId: number;
  clientName: string;
  workspaceId: number;
  workspaceName: string;
  channelName: string;
  metricCode: MetricCode;
  metricLabel: string;
  campaignKey?: string;
  campaignName?: string;
  from: string;
  to: string;
  currentTotal: number;
  format: MetricFormat;
};

function CorrectionForm({
  context,
  onClose,
}: {
  context: CorrectionContext;
  onClose: () => void;
}) {
  const mutation = useCreateCorrection();
  const [submitError, setSubmitError] = useState("");
  const isInteger = isIntegerMetric(context.metricCode);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CorrectionFormValues, unknown, CorrectionFormOutput>({
    resolver: zodResolver(correctionFormSchema(context.metricCode)),
    defaultValues: { corrected_total: "", note: "" },
  });

  async function submit(values: CorrectionFormOutput) {
    setSubmitError("");
    try {
      await mutation.mutateAsync({
        agencyId: context.agencyId,
        clientId: context.clientId,
        payload: {
          workspace_id: context.workspaceId,
          metric_code: context.metricCode,
          campaign_key: context.campaignKey ?? null,
          date_from: context.from,
          date_to: context.to,
          corrected_total: values.corrected_total,
          note: values.note,
        },
      });
      toast({
        title: "Correction saved",
        description: `${context.metricLabel} for ${context.workspaceName} was updated in every ${context.clientName} report.`,
        tone: "success",
      });
      onClose();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setSubmitError("The correction could not be saved. Please try again.");
        return;
      }
      const totalError = error.fieldErrors.corrected_total;
      const noteError = error.fieldErrors.note;
      if (totalError)
        setError("corrected_total", { type: "server", message: totalError });
      if (noteError) setError("note", { type: "server", message: noteError });
      // Errors on the fixed context (dates, metric, campaign) have no input.
      if (!totalError && !noteError) setSubmitError(error.message);
    }
  }

  const unit =
    context.format.kind === "currency" ? context.format.currency : undefined;
  const totalHint = isInteger
    ? "Whole numbers only."
    : unit
      ? `Amount in ${unit}.`
      : undefined;
  const totalDescribedBy = errors.corrected_total
    ? "correction-total-error"
    : totalHint
      ? "correction-total-description"
      : undefined;

  return (
    <form
      aria-label={`Correct ${context.metricLabel}`}
      className="space-y-5"
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
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs">Dates</dt>
          <dd className="text-strong mt-1 font-medium">
            {formatDateRange(context.from, context.to)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Current total</dt>
          <dd className="text-strong mt-1 font-medium tabular-nums">
            {formatMetricValue(context.currentTotal, context.format)}
          </dd>
        </div>
      </dl>
      <FormField
        description={totalHint}
        error={errors.corrected_total?.message}
        id="correction-total"
        label="New total"
        required
      >
        <div className="flex items-center gap-2">
          {unit && (
            <span aria-hidden className="text-muted-foreground text-sm">
              {unit}
            </span>
          )}
          <Input
            aria-describedby={totalDescribedBy}
            aria-invalid={Boolean(errors.corrected_total)}
            autoComplete="off"
            className="tabular-nums"
            id="correction-total"
            inputMode={isInteger ? "numeric" : "decimal"}
            {...register("corrected_total")}
          />
        </div>
      </FormField>
      <FormField error={errors.note?.message} id="correction-note" label="Note">
        <Textarea
          aria-describedby={errors.note ? "correction-note-error" : undefined}
          aria-invalid={Boolean(errors.note)}
          className="min-h-20"
          id="correction-note"
          placeholder="Why the value is being corrected (optional)"
          {...register("note")}
        />
      </FormField>
      <p className="bg-muted text-muted-foreground rounded-lg border p-3 text-sm">
        This changes {context.metricLabel} for {context.channelName} in every{" "}
        {context.clientName} report for these dates. Totals, ROAS, CPA and
        charts will recalculate.
      </p>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button
          disabled={mutation.isPending}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Saving..." : "Save correction"}
        </Button>
      </div>
    </form>
  );
}

export function CorrectionDialog({
  context,
  onClose,
}: {
  context: CorrectionContext | null;
  onClose: () => void;
}) {
  const campaign = context?.campaignName ?? context?.campaignKey;
  return (
    <Dialog
      description={campaign ? `Campaign: ${campaign}` : undefined}
      isOpen={Boolean(context)}
      onClose={onClose}
      title={
        context
          ? `Correct ${context.metricLabel} — ${context.channelName} (${context.workspaceName})`
          : "Correct value"
      }
    >
      {context && (
        // A new key starts a clean form for each value opened.
        <CorrectionForm
          context={context}
          key={[
            context.workspaceId,
            context.metricCode,
            context.campaignKey,
            context.from,
            context.to,
          ].join(":")}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}
