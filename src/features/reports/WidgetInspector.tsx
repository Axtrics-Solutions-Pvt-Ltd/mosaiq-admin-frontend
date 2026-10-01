"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LocateFixed, Plus, RotateCcw } from "lucide-react";
import { type FocusEvent, type Ref, useEffect, useRef, useState } from "react";
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
import {
  BudgetMonthEditor,
  type BudgetWorkspace,
} from "@/features/budgets/BudgetMonthEditor";
import type { WidgetPart } from "@/features/report-widgets/contracts";
import { ApiError } from "@/lib/api/errors";

import type { PreviewRange, ReportScope } from "./api";
import {
  type Accent,
  type EditingValue,
  type LayoutItem,
  reportMetricCodes,
  reportMetricLabel,
} from "./contracts";
import { CreativeSettings } from "./CreativeSettings";
import type { InspectorDraft } from "./draft-preview";
import {
  activeCampaignsMaxLimit,
  breakdownMetricCodes,
  breakdownWidgetCodes,
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
  InspectorFormContext,
  type InspectorFormHandle,
  type InspectorFormProps,
  ListControls,
  type SaveHandler,
  TitleFields,
  useReportDirty,
  useSubmit,
} from "./inspector-parts";
import { itemTitle } from "./layout";
import { hasManualEditor } from "./manual-forms";
import { ManualDataForm } from "./ManualDataForms";
import { useResetLayoutItem, useUpdateLayoutItem } from "./queries";
import { SectionForm } from "./SectionForm";
import { MoveMenu } from "./Sortable";

const kindLabels = {
  live: "Live data",
  text: "Written",
  manual_data: "Manual data",
} as const;
// How a widget looks, in words, in place of the API's render type code.
const typeLabels: Record<string, string> = {
  text_hero: "Headline and text",
  kpi: "Single KPI",
  kpi_group: "KPI cards",
  kpi_list: "KPI list",
  line_chart: "Line chart",
  donut: "Donut chart",
  gauge: "Gauge",
  bar_chart: "Bar chart",
  bullet_list: "Bullet list",
  recommendation_list: "Recommendations",
  progress_list: "Progress bars",
  channel_list: "Channel list",
  metric_table: "Metrics table",
  field_table: "Field table",
  data_table: "Table",
  heatmap: "Heatmap",
  creative_grid: "Creative grid",
};

// An unknown type from a newer API reads as words rather than a code.
export function widgetTypeLabel(type: string) {
  const words = type.replace(/_/g, " ");
  return typeLabels[type] ?? words.charAt(0).toUpperCase() + words.slice(1);
}

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
    // A creative's name is checked per key; the error shows on the list.
    if (field === "creative_overrides") return "creative_titles";
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

// What the preview shows for the selected live widget, so the inspector can
// explain where its numbers are edited and switch the preview's channel.
export type LiveEditing = {
  values: readonly EditingValue[];
  channel: string | undefined;
  channels: readonly { code: string; name: string }[];
  onChannelChange: (channel: string | undefined) => void;
  // Opens the selected widget's values table, where the pencils are.
  onRevealValues?: () => void;
  // Scrolls the preview to the selected widget's glowing values.
  onShowValues?: () => void;
  // The preview's date range and channel, for lists that follow it.
  range?: PreviewRange;
};

// Widgets with one row per campaign or creative. Their values belong to one
// workspace each, so they offer no channel picker.
const rowWidgetNotes: Record<string, string> = {
  active_campaigns:
    "Each campaign's numbers come from its channel's data. To change one, use the pencil beside the value in the preview. The correction also changes that channel's totals. CTR is calculated: use its lock to correct the campaign's clicks or impressions.",
  creative_performance:
    "Creative numbers come from the channel data and can't be corrected yet. Choose what each card shows and manage the creatives above.",
};

function LiveNumbersNote({
  item,
  liveEditing,
}: {
  item: LayoutItem;
  liveEditing?: LiveEditing;
}) {
  const rowNote = rowWidgetNotes[item.code];
  // A base value with no single workspace: its pencil is off until the
  // preview is narrowed to one channel.
  const combinesWorkspaces = (liveEditing?.values ?? []).some(
    (value) => value.is_base && value.workspace_id === undefined,
  );
  const channels = liveEditing?.channels ?? [];
  const channel = liveEditing?.channel;
  const onChannelChange = liveEditing?.onChannelChange;
  const onRevealValues = liveEditing?.onRevealValues;
  const onShowValues = liveEditing?.onShowValues;
  const hasValues = (liveEditing?.values.length ?? 0) > 0;
  const canPickChannel = channels.length > 1 && !rowNote;
  const showChannelPicker =
    canPickChannel && (combinesWorkspaces || channel !== undefined);

  let note =
    "Numbers in this widget come from the channel data. To change one, use the pencil beside the value in the preview. Calculated values such as ROAS show a lock: correct the values they are calculated from instead.";
  if (rowNote) note = rowNote;
  else if (breakdownWidgetCodes.has(item.code))
    note =
      "These shares follow the report's corrected totals and can't be edited one by one.";
  else if (combinesWorkspaces)
    note =
      channel === undefined && canPickChannel
        ? "This report combines several channels, so these totals can't be edited directly. Choose a channel below, then use the pencil beside a value in the preview."
        : "These values combine several workspaces, so they can't be corrected from this preview.";

  return (
    <div className="bg-muted text-muted-foreground space-y-3 rounded-md border p-3 text-xs">
      <p>{note}</p>
      {onShowValues && hasValues && (
        <Button
          onClick={onShowValues}
          size="sm"
          type="button"
          variant="outline"
        >
          <LocateFixed aria-hidden className="size-4" /> Show me where
        </Button>
      )}
      {onChannelChange && showChannelPicker && (
        <FormField id="inspector-edit-channel" label="Edit numbers for">
          <Select
            id="inspector-edit-channel"
            onChange={(event) => {
              onChannelChange(event.target.value || undefined);
              onRevealValues?.();
            }}
            // Opening the picker shows where the numbers are edited, even
            // before a channel is chosen. Pointer-down covers a click on a
            // picker that already has focus.
            onFocus={onRevealValues}
            onPointerDown={onRevealValues}
            value={channel ?? ""}
          >
            <option value="">All channels</option>
            {channels.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}
    </div>
  );
}

// Live widgets change presentation only. Their numbers come from the data
// and are corrected from the pencil on a value, so there are no value inputs.
function LiveWidgetForm({
  item,
  liveEditing,
  onDirtyChange,
  save,
  isSaving,
  scope,
}: InspectorFormProps & { liveEditing?: LiveEditing; scope: ReportScope }) {
  const form = useForm<LiveFormValues>({
    resolver: zodResolver(liveFormSchema),
    defaultValues: toLiveValues(item),
  });
  const { formError, onDiscard, onSubmit } = useSubmit(
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
      onDiscard={onDiscard}
      onSubmit={onSubmit}
      // Budget pacing also has budgets with their own Save, so this one
      // names what it saves.
      saveLabel={item.code === budgetWidgetCode ? "Save settings" : undefined}
      // Settings change the numbers, which the API works out on save.
      previewNote="The canvas shows the new title now. Other settings show once saved."
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
        <CreativeSettings
          form={form}
          item={item}
          range={liveEditing?.range ?? {}}
          scope={scope}
        />
      )}
      {item.code === "active_campaigns" && (
        <FormField
          description={`Up to ${activeCampaignsMaxLimit}, largest spend first. Leave empty for the default.`}
          error={errors.limit?.message}
          id="inspector-limit"
          label="Campaigns shown"
        >
          <Input
            aria-describedby="inspector-limit-description"
            aria-invalid={Boolean(errors.limit)}
            autoComplete="off"
            id="inspector-limit"
            inputMode="numeric"
            placeholder="Default (50)"
            {...form.register("limit")}
          />
        </FormField>
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
      <LiveNumbersNote item={item} liveEditing={liveEditing} />
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
  const { formError, onDiscard, onSubmit } = useSubmit(
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
      onDiscard={onDiscard}
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
  const { formError, onDiscard, onSubmit } = useSubmit(
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
      onDiscard={onDiscard}
      onSubmit={onSubmit}
    >
      <TitleFields form={form} item={item} />
      <p className="bg-muted text-muted-foreground rounded-md border p-3 text-xs">
        {note}
      </p>
    </FormShell>
  );
}

// The inspector field behind each part of a widget card.
const partFieldIds: Partial<Record<WidgetPart, string>> = {
  title: "inspector-title",
  subtitle: "inspector-subtitle",
  as_of: "inspector-as-of",
};

function partOfField(form: Element, field: Element): WidgetPart | undefined {
  const part = (Object.entries(partFieldIds) as [WidgetPart, string][]).find(
    ([, id]) => id === field.id,
  )?.[0];
  if (part) return part;
  return form.contains(field) ? "content" : undefined;
}

// A part's field, or for the content the first field after the titles.
function fieldForPart(form: Element, part: WidgetPart) {
  const id = partFieldIds[part];
  const field = id ? form.querySelector<HTMLElement>(`#${id}`) : null;
  if (field) return field;
  const controls = Array.from(
    form.querySelectorAll<HTMLElement>("input, select, textarea"),
  );
  const subtitle = controls.findIndex(
    (control) => control.id === partFieldIds.subtitle,
  );
  return controls[subtitle + 1] ?? null;
}

// Budget pacing reads the client's monthly budgets, edited beside the widget.
export const budgetWidgetCode = "budget_utilization";

export type InspectorBudgets = {
  allBudgetsHref: string;
  focusRequest: number;
  initialMonth: string;
  workspaces: readonly BudgetWorkspace[];
};

// Edits one widget, or a section's colour and title (`accents` are the
// swatches from GET layout).
export function WidgetInspector({
  accents = [],
  budgets,
  focusPart,
  formRef,
  item,
  liveEditing,
  onActivePartChange,
  onBudgetsDirtyChange,
  onDirtyChange,
  onDraftChange,
  scope,
}: {
  accents?: readonly Accent[];
  budgets?: InspectorBudgets;
  // Moves focus to the field of a card part clicked on the canvas, each time
  // `count` changes.
  focusPart?: { part: WidgetPart; count: number };
  // Saves the open form, for the builder's unsaved-changes dialog.
  formRef?: Ref<InspectorFormHandle>;
  item: LayoutItem;
  liveEditing?: LiveEditing;
  // The card part whose field has focus, so the canvas can outline it.
  onActivePartChange?: (part: WidgetPart | undefined) => void;
  // Budgets save on their own, so the builder can't save them for the user.
  onBudgetsDirtyChange?: (isDirty: boolean) => void;
  onDirtyChange: (isDirty: boolean) => void;
  // The form's unsaved edits, previewed on the canvas.
  onDraftChange?: (draft: InspectorDraft | undefined) => void;
  scope: ReportScope;
}) {
  const updateMutation = useUpdateLayoutItem(scope);
  const resetMutation = useResetLayoutItem(scope);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  // A reset or a new item starts the form again from the stored values.
  const [formVersion, setFormVersion] = useState(0);
  const title = itemTitle(item);
  const isSection = item.level === "section";
  const noun = isSection ? "section" : "widget";
  // The widget form and the budgets have separate unsaved edits.
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isBudgetDirty, setIsBudgetDirty] = useState(false);
  useEffect(
    () => onDirtyChange(isFormDirty || isBudgetDirty),
    [isFormDirty, isBudgetDirty, onDirtyChange],
  );
  useEffect(
    () => onBudgetsDirtyChange?.(isBudgetDirty),
    [isBudgetDirty, onBudgetsDirtyChange],
  );

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
            `The ${noun} could not be saved. Please try again.`,
          );
    }
  };

  async function reset() {
    try {
      await resetMutation.mutateAsync(item.id);
      toast({ title: `${title} reset to its defaults`, tone: "success" });
      setIsFormDirty(false);
      setFormVersion((version) => version + 1);
    } catch {
      toast({
        title: isSection ? "Section not reset" : "Widget not reset",
        description: `The ${noun} could not be reset. Please try again.`,
        tone: "error",
      });
    }
    setIsConfirmingReset(false);
  }

  const formKey = `${item.id}-${formVersion}`;
  const formProps = {
    isSaving: updateMutation.isPending,
    item,
    onDirtyChange: setIsFormDirty,
    save,
  };

  const formsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const forms = formsRef.current;
    if (!focusPart || !forms) return;
    // Focus scrolls the field into the inspector's view.
    fieldForPart(forms, focusPart.part)?.focus();
  }, [focusPart]);

  function trackFocus(event: FocusEvent<HTMLDivElement>) {
    onActivePartChange?.(partOfField(event.currentTarget, event.target));
  }

  function clearFocus(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget))
      onActivePartChange?.(undefined);
  }

  const formContext = {
    formRef,
    onDraftChange: (patch: InspectorDraft["patch"] | undefined) =>
      onDraftChange?.(patch ? { itemId: item.id, patch } : undefined),
  };

  return (
    <section aria-label={`Inspector: ${title}`} className="space-y-4">
      <header className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {isSection ? "Section" : "Widget"}
            </p>
            <h2 className="text-strong text-base font-semibold">{title}</h2>
          </div>
          {/* Reset can't be undone, so it sits in a menu rather than beside
              Save. */}
          <MoveMenu
            label={`More actions for ${title}`}
            options={[
              {
                label: isSection ? "Reset section" : "Reset widget",
                icon: RotateCcw,
                onSelect: resetMutation.isPending
                  ? undefined
                  : () => setIsConfirmingReset(true),
              },
            ]}
            title={title}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.kind && <Badge tone="primary">{kindLabels[item.kind]}</Badge>}
          {item.type && (
            <Badge tone="neutral">{widgetTypeLabel(item.type)}</Badge>
          )}
          {!item.is_available && <Badge tone="neutral">Coming soon</Badge>}
        </div>
      </header>
      <div onBlur={clearFocus} onFocus={trackFocus} ref={formsRef}>
        <InspectorFormContext value={formContext}>
          {isSection && (
            <SectionForm accents={accents} key={formKey} {...formProps} />
          )}
          {item.kind === "live" && (
            <LiveWidgetForm
              key={formKey}
              {...formProps}
              liveEditing={liveEditing}
              scope={scope}
            />
          )}
          {/* Written content in a table shape (AI Strategic Insights) uses the
          table editor; headlines and lists use the text editor. */}
          {item.kind === "text" &&
            (hasManualEditor(item.type) ? (
              <ManualDataForm key={formKey} {...formProps} />
            ) : (
              <TextWidgetForm key={formKey} {...formProps} />
            ))}
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
        </InspectorFormContext>
      </div>
      {budgets && item.code === budgetWidgetCode && (
        <BudgetMonthEditor
          agencyId={scope.agencyId}
          allBudgetsHref={budgets.allBudgetsHref}
          clientId={scope.clientId}
          focusRequest={budgets.focusRequest}
          initialMonth={budgets.initialMonth}
          key={`budgets-${item.id}`}
          onDirtyChange={setIsBudgetDirty}
          workspaces={budgets.workspaces}
        />
      )}
      <ConfirmationDialog
        body={
          <p>
            {isSection
              ? `${title} goes back to its catalogue defaults: its default visibility, colour and title.`
              : `${title} goes back to its catalogue defaults: its default visibility, and no custom title, settings or written content.`}
          </p>
        }
        confirmLabel={isSection ? "Reset section" : "Reset widget"}
        description="This can't be undone."
        isOpen={isConfirmingReset}
        isPending={resetMutation.isPending}
        onCancel={() => setIsConfirmingReset(false)}
        onConfirm={reset}
        title={isSection ? "Reset this section?" : "Reset this widget?"}
      />
    </section>
  );
}
