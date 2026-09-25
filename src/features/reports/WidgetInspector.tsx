"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import {
  useFieldArray,
  useForm,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/errors";

import type { ReportScope } from "./api";
import {
  type LayoutItem,
  reportMetricCodes,
  reportMetricLabel,
} from "./contracts";
import {
  breakdownMetricCodes,
  breakdownWidgetCodes,
  creativeMaxLimit,
  detailedTableMaxRows,
  kpiCardsMaxMetrics,
  liveFormSchema,
  type LiveFormValues,
  livePatch,
  textFormSchema,
  type TextFormValues,
  textPatch,
  titleFormSchema,
  type TitleFormValues,
  titlePatch,
  toLiveValues,
  toTextValues,
  toTitleValues,
} from "./inspector-forms";
import {
  AsOfField,
  FormShell,
  type InspectorFormProps,
  ListControls,
  type SaveHandler,
  TitleFields,
  useReportDirty,
  useSubmit,
} from "./inspector-parts";
import { hasManualEditor } from "./manual-forms";
import { ManualDataForm } from "./ManualDataForms";
import { useResetLayoutItem, useUpdateLayoutItem } from "./queries";
import { itemTitle } from "./StructurePanel";

const kindLabels = {
  live: "Live data",
  text: "Written",
  manual_data: "Manual data",
} as const;
// Catalogue defaults, shown while a setting is left empty.
const defaultKpiMetrics = ["spend", "impressions", "ctr", "conversions", "cpa"];
const defaultTableRows = ["roas", "cpa", "ctr", "cpm", "conversion_rate"];

// API field keys (`settings.title`, `content.items.2.title`) → form fields.
export function formFieldForServerKey(
  key: string,
  type: string | null,
): string | undefined {
  const [root, ...rest] = key.split(".");
  if (root === "as_of") return "as_of";
  if (root === "settings") {
    const [field, code, part] = rest;
    if (field === "row_overrides" && code && part)
      return `overrides.${code}.${part}`;
    if (field === "targets" && code) return `targets.${code}`;
    return field;
  }
  if (root === "content") {
    const [field, index, part] = rest;
    if (field === "items" && index !== undefined) {
      if (type === "bullet_list") return `bullets.${index}.text`;
      if (type === "recommendation_list")
        return `recommendations.${index}.${part ?? "title"}`;
    }
    return field;
  }
  return undefined;
}

function MetricChecklist({
  codes,
  defaults,
  form,
  legend,
  max,
  name,
}: {
  codes: readonly string[];
  defaults: readonly string[];
  form: UseFormReturn<LiveFormValues>;
  legend: string;
  max: number;
  name: "metrics" | "rows";
}) {
  const selected = useWatch({ control: form.control, name });
  const error = form.formState.errors[name]?.message;
  return (
    <fieldset className="space-y-2">
      <legend className="text-strong text-sm font-medium">{legend}</legend>
      <p className="text-muted-foreground text-xs">
        Up to {max}. Leave all unticked for the default:{" "}
        {defaults.map(reportMetricLabel).join(", ")}.
      </p>
      {error && (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-2">
        {codes.map((code) => {
          const id = `inspector-${name}-${code}`;
          return (
            <li className="flex items-center gap-2 text-sm" key={code}>
              <Checkbox
                disabled={!selected.includes(code) && selected.length >= max}
                id={id}
                value={code}
                {...form.register(name)}
              />
              <label htmlFor={id}>{reportMetricLabel(code)}</label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

// Live widgets change presentation only. Their numbers come from the data
// and are corrected from the pencil on a value, so there are no value inputs.
function LiveWidgetForm({
  item,
  onDirtyChange,
  save,
  isSaving,
}: InspectorFormProps) {
  const form = useForm<LiveFormValues>({
    resolver: zodResolver(liveFormSchema),
    defaultValues: toLiveValues(item),
  });
  const { formError, onSubmit } = useSubmit(
    form,
    save,
    (values) => livePatch(item, values),
    (key) => formFieldForServerKey(key, item.type),
  );
  useReportDirty(form.formState.isDirty, onDirtyChange);
  const rows = useWatch({ control: form.control, name: "rows" });
  const tableRows = rows.length ? rows : defaultTableRows;
  const errors = form.formState.errors;
  return (
    <FormShell
      formError={formError}
      isDirty={form.formState.isDirty}
      isSaving={isSaving}
      label={`${itemTitle(item)} settings`}
      onSubmit={onSubmit}
    >
      <TitleFields form={form} item={item} />
      {item.code === "kpi_cards" && (
        <MetricChecklist
          codes={reportMetricCodes}
          defaults={defaultKpiMetrics}
          form={form}
          legend="Metrics"
          max={kpiCardsMaxMetrics}
          name="metrics"
        />
      )}
      {item.code === "detailed_metrics_table" && (
        <>
          <MetricChecklist
            codes={reportMetricCodes}
            defaults={defaultTableRows}
            form={form}
            legend="Rows"
            max={detailedTableMaxRows}
            name="rows"
          />
          <fieldset className="space-y-3">
            <legend className="text-strong text-sm font-medium">
              Targets and row text
            </legend>
            <p className="text-muted-foreground text-xs">
              A row&apos;s status compares its value with the target. Label,
              status and details replace the calculated text.
            </p>
            {tableRows.map((code) => (
              <div className="space-y-2 rounded-md border p-3" key={code}>
                <p className="text-strong text-sm font-medium">
                  {reportMetricLabel(code)}
                </p>
                <FormField
                  error={errors.targets?.[code]?.message}
                  id={`inspector-target-${code}`}
                  label="Target"
                >
                  <Input
                    aria-invalid={Boolean(errors.targets?.[code])}
                    autoComplete="off"
                    id={`inspector-target-${code}`}
                    inputMode="decimal"
                    {...form.register(`targets.${code}`)}
                  />
                </FormField>
                <FormField id={`inspector-label-${code}`} label="Row label">
                  <Input
                    id={`inspector-label-${code}`}
                    {...form.register(`overrides.${code}.label`)}
                  />
                </FormField>
                <FormField id={`inspector-status-${code}`} label="Status text">
                  <Input
                    id={`inspector-status-${code}`}
                    {...form.register(`overrides.${code}.status_label`)}
                  />
                </FormField>
                <FormField id={`inspector-details-${code}`} label="Details">
                  <Textarea
                    className="min-h-16"
                    id={`inspector-details-${code}`}
                    {...form.register(`overrides.${code}.details`)}
                  />
                </FormField>
              </div>
            ))}
          </fieldset>
        </>
      )}
      {item.code === "creative_performance" && (
        <>
          <FormField id="inspector-sort" label="Rank creatives by">
            <Select id="inspector-sort" {...form.register("sort_metric")}>
              <option value="">Default (Conversions)</option>
              {reportMetricCodes.map((code) => (
                <option key={code} value={code}>
                  {reportMetricLabel(code)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="inspector-limit" label="Creatives shown">
            <Select id="inspector-limit" {...form.register("limit")}>
              <option value="">Default (6)</option>
              {Array.from(
                { length: creativeMaxLimit },
                (_, index) => index + 1,
              ).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </Select>
          </FormField>
        </>
      )}
      {breakdownWidgetCodes.has(item.code) && (
        <FormField id="inspector-metric" label="Metric">
          <Select id="inspector-metric" {...form.register("metric")}>
            <option value="">Default</option>
            {breakdownMetricCodes.map((code) => (
              <option key={code} value={code}>
                {reportMetricLabel(code)}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <p className="bg-muted text-muted-foreground rounded-md border p-3 text-xs">
        Numbers in this widget come from the channel data. To change one, use
        the pencil beside the value in the preview.
      </p>
    </FormShell>
  );
}

function TextWidgetForm({
  item,
  onDirtyChange,
  save,
  isSaving,
}: InspectorFormProps) {
  const form = useForm<TextFormValues>({
    resolver: zodResolver(textFormSchema),
    defaultValues: toTextValues(item),
  });
  const bullets = useFieldArray({ control: form.control, name: "bullets" });
  const recommendations = useFieldArray({
    control: form.control,
    name: "recommendations",
  });
  const { formError, onSubmit } = useSubmit(
    form,
    save,
    (values) => textPatch(item, values),
    (key) => formFieldForServerKey(key, item.type),
  );
  useReportDirty(form.formState.isDirty, onDirtyChange);
  const errors = form.formState.errors;
  return (
    <FormShell
      formError={formError}
      isDirty={form.formState.isDirty}
      isSaving={isSaving}
      label={`${itemTitle(item)} content`}
      onSubmit={onSubmit}
    >
      <TitleFields form={form} item={item} />
      {item.type === "text_hero" && (
        <>
          <FormField
            error={errors.headline?.message}
            id="inspector-headline"
            label="Headline"
          >
            <Input
              aria-invalid={Boolean(errors.headline)}
              id="inspector-headline"
              {...form.register("headline")}
            />
          </FormField>
          <FormField
            error={errors.body?.message}
            id="inspector-body"
            label="Text"
          >
            <Textarea
              aria-invalid={Boolean(errors.body)}
              className="min-h-40"
              id="inspector-body"
              {...form.register("body")}
            />
          </FormField>
          <p className="text-muted-foreground text-xs">
            Clear the headline and text to leave this widget empty.
          </p>
        </>
      )}
      {item.type === "bullet_list" && (
        <fieldset className="space-y-2">
          <legend className="text-strong text-sm font-medium">Points</legend>
          {errors.bullets?.message && (
            <p className="text-destructive text-xs font-medium" role="alert">
              {errors.bullets.message}
            </p>
          )}
          <ol className="space-y-2">
            {bullets.fields.map((field, index) => (
              <li className="flex items-start gap-1" key={field.id}>
                <div className="flex-1">
                  <FormField
                    error={errors.bullets?.[index]?.text?.message}
                    id={`inspector-bullet-${index}`}
                    label={`Point ${index + 1}`}
                  >
                    <Textarea
                      aria-invalid={Boolean(errors.bullets?.[index]?.text)}
                      className="min-h-16"
                      id={`inspector-bullet-${index}`}
                      {...form.register(`bullets.${index}.text`)}
                    />
                  </FormField>
                </div>
                <ListControls
                  count={bullets.fields.length}
                  index={index}
                  label={`point ${index + 1}`}
                  move={bullets.move}
                  remove={bullets.remove}
                />
              </li>
            ))}
          </ol>
          <Button
            disabled={bullets.fields.length >= 20}
            onClick={() => bullets.append({ text: "" })}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden className="size-4" /> Add point
          </Button>
        </fieldset>
      )}
      {item.type === "recommendation_list" && (
        <fieldset className="space-y-2">
          <legend className="text-strong text-sm font-medium">
            Recommendations
          </legend>
          {errors.recommendations?.message && (
            <p className="text-destructive text-xs font-medium" role="alert">
              {errors.recommendations.message}
            </p>
          )}
          <ol className="space-y-3">
            {recommendations.fields.map((field, index) => (
              <li className="space-y-2 rounded-md border p-3" key={field.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-strong text-sm font-medium">
                    Recommendation {index + 1}
                  </p>
                  <ListControls
                    count={recommendations.fields.length}
                    index={index}
                    label={`recommendation ${index + 1}`}
                    move={recommendations.move}
                    remove={recommendations.remove}
                  />
                </div>
                <FormField
                  error={errors.recommendations?.[index]?.title?.message}
                  id={`inspector-rec-title-${index}`}
                  label="Title"
                >
                  <Input
                    aria-invalid={Boolean(
                      errors.recommendations?.[index]?.title,
                    )}
                    id={`inspector-rec-title-${index}`}
                    {...form.register(`recommendations.${index}.title`)}
                  />
                </FormField>
                <FormField
                  error={errors.recommendations?.[index]?.body?.message}
                  id={`inspector-rec-body-${index}`}
                  label="Detail"
                >
                  <Textarea
                    className="min-h-16"
                    id={`inspector-rec-body-${index}`}
                    {...form.register(`recommendations.${index}.body`)}
                  />
                </FormField>
                <FormField
                  error={errors.recommendations?.[index]?.owner?.message}
                  id={`inspector-rec-owner-${index}`}
                  label="Owner"
                >
                  <Input
                    id={`inspector-rec-owner-${index}`}
                    {...form.register(`recommendations.${index}.owner`)}
                  />
                </FormField>
              </li>
            ))}
          </ol>
          <Button
            disabled={recommendations.fields.length >= 20}
            onClick={() =>
              recommendations.append({ title: "", body: "", owner: "" })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden className="size-4" /> Add recommendation
          </Button>
        </fieldset>
      )}
      <AsOfField form={form} />
    </FormShell>
  );
}

function TitleOnlyForm({
  item,
  note,
  onDirtyChange,
  save,
  isSaving,
}: InspectorFormProps & { note: string }) {
  const form = useForm<TitleFormValues>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: toTitleValues(item),
  });
  const { formError, onSubmit } = useSubmit(
    form,
    save,
    (values) => titlePatch(item, values),
    (key) => formFieldForServerKey(key, item.type),
  );
  useReportDirty(form.formState.isDirty, onDirtyChange);
  return (
    <FormShell
      formError={formError}
      isDirty={form.formState.isDirty}
      isSaving={isSaving}
      label={`${itemTitle(item)} settings`}
      onSubmit={onSubmit}
    >
      <TitleFields form={form} item={item} />
      <p className="bg-muted text-muted-foreground rounded-md border p-3 text-xs">
        {note}
      </p>
    </FormShell>
  );
}

export function WidgetInspector({
  item,
  onDirtyChange,
  scope,
}: {
  item: LayoutItem;
  onDirtyChange: (isDirty: boolean) => void;
  scope: ReportScope;
}) {
  const updateMutation = useUpdateLayoutItem(scope);
  const resetMutation = useResetLayoutItem(scope);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  // A reset or a new item starts the form again from the stored values.
  const [formVersion, setFormVersion] = useState(0);
  const title = itemTitle(item);

  const save: SaveHandler = async (patch) => {
    try {
      await updateMutation.mutateAsync({ itemId: item.id, patch });
      toast({ title: `${title} saved`, tone: "success" });
      return undefined;
    } catch (error) {
      return error instanceof ApiError
        ? error
        : new ApiError(
            0,
            undefined,
            {},
            undefined,
            "The widget could not be saved. Please try again.",
          );
    }
  };

  async function reset() {
    try {
      await resetMutation.mutateAsync(item.id);
      toast({ title: `${title} reset to its defaults`, tone: "success" });
      onDirtyChange(false);
      setFormVersion((version) => version + 1);
    } catch {
      toast({
        title: "Widget not reset",
        description: "The widget could not be reset. Please try again.",
        tone: "error",
      });
    }
    setIsConfirmingReset(false);
  }

  const formKey = `${item.id}-${formVersion}`;
  const formProps = {
    isSaving: updateMutation.isPending,
    item,
    onDirtyChange,
    save,
  };

  return (
    <section aria-label={`Inspector: ${title}`} className="space-y-4">
      <header className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">Widget</p>
        <h2 className="text-strong text-base font-semibold">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {item.kind && <Badge tone="primary">{kindLabels[item.kind]}</Badge>}
          {item.type && <Badge tone="neutral">{item.type}</Badge>}
          {!item.is_available && <Badge tone="neutral">Coming soon</Badge>}
        </div>
      </header>
      {item.kind === "live" && <LiveWidgetForm key={formKey} {...formProps} />}
      {item.kind === "text" && <TextWidgetForm key={formKey} {...formProps} />}
      {item.kind === "manual_data" &&
        (hasManualEditor(item.type) ? (
          <ManualDataForm key={formKey} {...formProps} />
        ) : (
          <TitleOnlyForm
            key={formKey}
            {...formProps}
            note="This widget's content can't be edited here yet. You can rename it and show or hide it."
          />
        ))}
      <div className="border-t pt-4">
        <Button
          disabled={resetMutation.isPending}
          onClick={() => setIsConfirmingReset(true)}
          size="sm"
          type="button"
          variant="outline"
        >
          <RotateCcw aria-hidden className="size-4" /> Reset widget
        </Button>
      </div>
      <ConfirmationDialog
        body={
          <p>
            {title} goes back to its catalogue defaults: its default visibility,
            and no custom title, settings or written content.
          </p>
        }
        confirmLabel="Reset widget"
        description="This can't be undone."
        isOpen={isConfirmingReset}
        isPending={resetMutation.isPending}
        onCancel={() => setIsConfirmingReset(false)}
        onConfirm={reset}
        title="Reset this widget?"
      />
    </section>
  );
}
