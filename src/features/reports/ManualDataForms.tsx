"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useState } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
  useFieldArray,
  useForm,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { type ValueFormat, valueFormats } from "@/lib/formatters";

import { audienceEntriesShown } from "./audience-filter";
import type { Audience } from "./contracts";
import {
  AsOfField,
  FormShell,
  type InspectorFormProps,
  RowListEditor,
  TitleFields,
  useReportDirty,
  useSubmit,
} from "./inspector-parts";
import { itemTitle } from "./layout";
import {
  cellStatusCodes,
  changeDirectionLabels,
  changeDirections,
  changeSentimentLabels,
  changeSentiments,
  emptyRow,
  formatLabels,
  gaugeStatusCodes,
  manualFieldForServerKey,
  manualLimits,
  manualPatch,
  manualSchemas,
  type ManualType,
  type ManualValues,
  numericFormats,
  statusCodeLabels,
  toManualValues,
} from "./manual-forms";

type StatusCell =
  ManualValues<"data_table">["rows"][number]["statuses"][number];

function useManualForm<Type extends ManualType>(
  type: Type,
  { item, onDirtyChange, save }: InspectorFormProps,
  initialValues: ManualValues<Type>,
) {
  const form = useForm<ManualValues<Type>>({
    resolver: zodResolver(manualSchemas[type] as never) as Resolver<
      ManualValues<Type>
    >,
    defaultValues: initialValues as DefaultValues<ManualValues<Type>>,
  });
  const { formError, onDiscard, onSubmit } = useSubmit(
    form,
    save,
    (values) => manualPatch(type, item, values),
    (key, values) => manualFieldForServerKey(type, key, values),
  );
  useReportDirty(form.formState.isDirty, onDirtyChange);
  return { form, formError, onDiscard, onSubmit };
}

function fieldId(name: string) {
  return `manual-${name.replace(/\./g, "-")}`;
}

// One labelled control bound to a form path, showing its own error.
function Field<Values extends FieldValues>({
  as = "input",
  description,
  form,
  inputMode,
  label,
  name,
  options,
}: {
  as?: "input" | "textarea" | "select";
  description?: string;
  form: UseFormReturn<Values>;
  inputMode?: "decimal";
  label: string;
  name: Path<Values>;
  options?: readonly { value: string; label: string }[];
}) {
  const id = fieldId(name);
  const error = form.getFieldState(name, form.formState).error?.message;
  const shared = {
    "aria-invalid": Boolean(error),
    id,
    ...form.register(name),
  };
  return (
    <FormField description={description} error={error} id={id} label={label}>
      {as === "select" ? (
        <Select {...shared}>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : as === "textarea" ? (
        <Textarea className="min-h-16" {...shared} />
      ) : (
        <Input autoComplete="off" inputMode={inputMode} {...shared} />
      )}
    </FormField>
  );
}

const formatOptions = (formats: readonly ValueFormat[]) =>
  formats.map((format) => ({ value: format, label: formatLabels[format] }));
const numericFormatOptions = formatOptions(numericFormats);
const anyFormatOptions = formatOptions(valueFormats);
const directionOptions = [
  { value: "", label: "No comparison" },
  ...changeDirections.map((direction) => ({
    value: direction,
    label: changeDirectionLabels[direction],
  })),
];
const statusOptions = (codes: readonly (keyof typeof statusCodeLabels)[]) => [
  { value: "", label: "No status" },
  ...codes.map((code) => ({ value: code, label: statusCodeLabels[code] })),
];
const cellStatusOptions = statusOptions(cellStatusCodes);
const gaugeStatusOptions = statusOptions(gaugeStatusCodes);
const sentimentOptions = [
  { value: "", label: "Choose a tone" },
  ...changeSentiments.map((sentiment) => ({
    value: sentiment,
    label: changeSentimentLabels[sentiment],
  })),
];

// The audience a row is shown for, on Marketing Intelligence widgets of a
// report with audiences. A code no longer in the list is kept as it is, so
// saving never drops a tag silently.
function AudienceField<Values extends FieldValues>({
  audiences,
  form,
  name,
}: {
  audiences: readonly Audience[];
  form: UseFormReturn<Values>;
  name: Path<Values>;
}) {
  const current = String(form.getValues(name) ?? "");
  if (audiences.length === 0 && !current) return null;
  const isKnown = audiences.some((audience) => audience.code === current);
  return (
    <Field
      as="select"
      form={form}
      label="Audience"
      name={name}
      options={[
        { value: "", label: "All audiences" },
        ...audiences.map((audience) => ({
          value: audience.code,
          label: audience.label,
        })),
        ...(current && !isKnown
          ? [{ value: current, label: "Unknown audience" }]
          : []),
      ]}
    />
  );
}

// How tagged rows behave in the portal's audience filter. Summary rows
// (KPIs, fields, totals) are the totals when untagged; breakdown rows are
// each audience's share.
function AudienceNote({
  audiences,
  kind,
}: {
  audiences: readonly Audience[];
  kind: "summary" | "breakdown";
}) {
  if (audiences.length === 0) return null;
  return (
    <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
      {kind === "summary"
        ? "Viewers can filter by audience. Untagged rows are the totals, shown when no audience is selected; tag a row with an audience to show it when that audience is selected."
        : "Viewers can filter by audience. Tag each row with its audience; with an audience selected, only its rows are shown."}
    </p>
  );
}

type ManualFormProps<Type extends ManualType> = InspectorFormProps & {
  initial: ManualValues<Type>;
  audiences: readonly Audience[];
  // The builder's audience filter, empty for none.
  audienceFilter: readonly string[];
};

// The entries of a list the form shows for the builder's audience filter.
// An entry is placed by the audience it had when it came into the form, or
// when the filter last changed, so changing its tag doesn't hide it while
// it's being edited.
function useShownEntries(
  fields: readonly { id: string }[],
  current: () => readonly unknown[],
  filter: readonly string[],
  keepUntagged = false,
) {
  const key = filter.join(",");
  const [placed, setPlaced] = useState({
    key,
    tags: {} as Record<string, string>,
  });
  if (placed.key !== key) {
    const values = current();
    setPlaced({
      key,
      tags: Object.fromEntries(
        fields.map((field, index) => [field.id, audienceOf(values[index])]),
      ),
    });
  }
  return audienceEntriesShown(
    fields.map((field) => placed.tags[field.id] ?? audienceOf(field)),
    filter,
    keepUntagged,
  );
}

function audienceOf(entry: unknown) {
  const audience = (entry as { audience?: unknown } | undefined)?.audience;
  return typeof audience === "string" ? audience : "";
}

// Whether a row the form doesn't show has an error.
function hasHiddenError(errors: unknown, shown: readonly number[]) {
  return (
    Array.isArray(errors) &&
    errors.some((error, index) => error && !shown.includes(index))
  );
}

// A row added while the filter is on starts tagged with its first audience,
// so it is shown.
function newRowAudience(filter: readonly string[]) {
  return filter[0] ? { audience: filter[0] } : {};
}

function arrayError(error: unknown) {
  const record = error as
    { message?: string; root?: { message?: string } } | undefined;
  return record?.message ?? record?.root?.message;
}

function ManualShell<Values extends ManualValues<ManualType>>({
  children,
  form,
  formError,
  isSaving,
  item,
  onDiscard,
  onSubmit,
}: {
  children: ReactNode;
  form: UseFormReturn<Values>;
  formError: string;
  isSaving: boolean;
  item: InspectorFormProps["item"];
  onDiscard: () => void;
  onSubmit: () => void;
}) {
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
      {children}
      <AsOfField form={form} />
    </FormShell>
  );
}

function KpiListForm(props: ManualFormProps<"kpi_list">) {
  const { form, ...submit } = useManualForm("kpi_list", props, props.initial);
  const items = useFieldArray({ control: form.control, name: "items" });
  const shown = useShownEntries(
    items.fields,
    () => form.getValues("items"),
    props.audienceFilter,
  );
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <AudienceNote audiences={props.audiences} kind="summary" />
      <RowListEditor
        addLabel="Add row"
        count={items.fields.length}
        description="Values are shown exactly as typed, e.g. 1.8M or $65B+."
        error={arrayError(form.formState.errors.items)}
        hasHiddenError={hasHiddenError(form.formState.errors.items, shown)}
        legend="Rows"
        max={manualLimits.kpiList}
        move={items.move}
        noun="row"
        onAdd={() =>
          items.append({
            ...emptyRow("kpi_list", form.getValues()),
            ...newRowAudience(props.audienceFilter),
          })
        }
        remove={items.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field form={form} label="Label" name={`items.${index}.label`} />
            <Field form={form} label="Value" name={`items.${index}.value`} />
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`items.${index}.audience`}
            />
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
        shown={shown}
      />
    </ManualShell>
  );
}

function BarChartForm(props: ManualFormProps<"bar_chart">) {
  const { form, ...submit } = useManualForm("bar_chart", props, props.initial);
  const items = useFieldArray({ control: form.control, name: "items" });
  const shown = useShownEntries(
    items.fields,
    () => form.getValues("items"),
    props.audienceFilter,
  );
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <AudienceNote audiences={props.audiences} kind="breakdown" />
      <RowListEditor
        addLabel="Add bar"
        count={items.fields.length}
        error={arrayError(form.formState.errors.items)}
        hasHiddenError={hasHiddenError(form.formState.errors.items, shown)}
        legend="Bars"
        max={manualLimits.barChart}
        move={items.move}
        noun="bar"
        onAdd={() =>
          items.append({
            ...(emptyRow(
              "bar_chart",
              form.getValues(),
            ) as ManualValues<"bar_chart">["items"][number]),
            ...newRowAudience(props.audienceFilter),
          })
        }
        remove={items.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <Field form={form} label="Label" name={`items.${index}.label`} />
            <Field
              form={form}
              inputMode="decimal"
              label="Value"
              name={`items.${index}.value`}
            />
            <Field
              as="select"
              form={form}
              label="Format"
              name={`items.${index}.format`}
              options={numericFormatOptions}
            />
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`items.${index}.audience`}
            />
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
        shown={shown}
      />
    </ManualShell>
  );
}

function DonutForm(props: ManualFormProps<"donut">) {
  const { form, ...submit } = useManualForm("donut", props, props.initial);
  const items = useFieldArray({ control: form.control, name: "items" });
  const shown = useShownEntries(
    items.fields,
    () => form.getValues("items"),
    props.audienceFilter,
  );
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <fieldset className="space-y-2 rounded-md border p-3">
        <legend className="text-strong px-1 text-sm font-medium">Centre</legend>
        <p className="text-muted-foreground text-xs">
          Optional. Leave both empty to show no centre value.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field form={form} label="Centre label" name="center.label" />
          <Field form={form} label="Centre value" name="center.value" />
          <Field
            as="select"
            form={form}
            label="Centre format"
            name="center.format"
            options={anyFormatOptions}
          />
        </div>
      </fieldset>
      <Field
        as="select"
        form={form}
        label="Segment format"
        name="itemFormat"
        options={numericFormatOptions}
      />
      <AudienceNote audiences={props.audiences} kind="breakdown" />
      <RowListEditor
        addLabel="Add segment"
        count={items.fields.length}
        description="Shares are worked out from the values."
        error={arrayError(form.formState.errors.items)}
        hasHiddenError={hasHiddenError(form.formState.errors.items, shown)}
        legend="Segments"
        max={manualLimits.donutItems}
        move={items.move}
        noun="segment"
        onAdd={() =>
          items.append({
            ...emptyRow("donut", form.getValues()),
            ...newRowAudience(props.audienceFilter),
          })
        }
        remove={items.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field form={form} label="Label" name={`items.${index}.label`} />
            <Field
              form={form}
              inputMode="decimal"
              label="Value"
              name={`items.${index}.value`}
            />
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`items.${index}.audience`}
            />
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
        shown={shown}
      />
    </ManualShell>
  );
}

function ProgressListForm(props: ManualFormProps<"progress_list">) {
  const { form, ...submit } = useManualForm(
    "progress_list",
    props,
    props.initial,
  );
  const groups = useFieldArray({ control: form.control, name: "groups" });
  const items = useFieldArray({ control: form.control, name: "items" });
  const footer = useFieldArray({ control: form.control, name: "footer" });
  const shownItems = useShownEntries(
    items.fields,
    () => form.getValues("items"),
    props.audienceFilter,
  );
  const shownFooter = useShownEntries(
    footer.fields,
    () => form.getValues("footer"),
    props.audienceFilter,
  );
  const groupValues = useWatch({ control: form.control, name: "groups" });
  const groupOptions = [
    { value: "", label: "Choose a group" },
    ...groupValues
      .filter((group) => group.key.trim())
      .map((group) => ({
        value: group.key.trim(),
        label: group.label.trim() || group.key.trim(),
      })),
  ];
  const errors = form.formState.errors;
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <RowListEditor
        addLabel="Add group"
        count={groups.fields.length}
        description="Optional. With groups, viewers switch between them and every row belongs to one."
        error={arrayError(errors.groups)}
        legend="Groups"
        max={manualLimits.progressGroups}
        move={groups.move}
        noun="group"
        onAdd={() => groups.append({ key: "", label: "" })}
        remove={groups.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field form={form} label="Label" name={`groups.${index}.label`} />
            <Field
              description="Letters, numbers, - and _."
              form={form}
              label="Key"
              name={`groups.${index}.key`}
            />
          </div>
        )}
        rowKeys={groups.fields.map((field) => field.id)}
      />
      <AudienceNote audiences={props.audiences} kind="breakdown" />
      <RowListEditor
        addLabel="Add row"
        count={items.fields.length}
        error={arrayError(errors.items)}
        hasHiddenError={hasHiddenError(errors.items, shownItems)}
        legend="Rows"
        max={manualLimits.progressItems}
        move={items.move}
        noun="row"
        onAdd={() =>
          items.append({
            ...(emptyRow(
              "progress_list",
              form.getValues(),
            ) as ManualValues<"progress_list">["items"][number]),
            ...newRowAudience(props.audienceFilter),
          })
        }
        remove={items.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            {groupValues.length > 0 && (
              <Field
                as="select"
                form={form}
                label="Group"
                name={`items.${index}.group`}
                options={groupOptions}
              />
            )}
            <Field form={form} label="Label" name={`items.${index}.label`} />
            <Field
              form={form}
              inputMode="decimal"
              label="Value"
              name={`items.${index}.value`}
            />
            <Field
              as="select"
              form={form}
              label="Format"
              name={`items.${index}.format`}
              options={numericFormatOptions}
            />
            <Field
              description="0–100, sets the bar length. Leave empty to work it out."
              form={form}
              inputMode="decimal"
              label="Share"
              name={`items.${index}.share`}
            />
            <Field
              description="Optional second value, e.g. Reach."
              form={form}
              label="Second label"
              name={`items.${index}.secondaryLabel`}
            />
            <Field
              form={form}
              label="Second value"
              name={`items.${index}.secondaryValue`}
            />
            <Field
              as="select"
              form={form}
              label="Second format"
              name={`items.${index}.secondaryFormat`}
              options={anyFormatOptions}
            />
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`items.${index}.audience`}
            />
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
        shown={shownItems}
      />
      <RowListEditor
        addLabel="Add total"
        count={footer.fields.length}
        description="Optional. Up to 4 totals under the list, each shown as its own column."
        error={arrayError(errors.footer)}
        hasHiddenError={hasHiddenError(errors.footer, shownFooter)}
        legend="Footer"
        max={manualLimits.progressFooter}
        move={footer.move}
        noun="total"
        onAdd={() =>
          footer.append({
            label: "",
            value: "",
            format: "number",
            changeValue: "",
            changeFormat: "percent",
            changeDirection: "",
            changeSentiment: "",
            changeLabel: "",
            audience: "",
            ...newRowAudience(props.audienceFilter),
          })
        }
        remove={footer.remove}
        renderRow={(index) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <Field form={form} label="Label" name={`footer.${index}.label`} />
              <Field form={form} label="Value" name={`footer.${index}.value`} />
              <Field
                as="select"
                form={form}
                label="Format"
                name={`footer.${index}.format`}
                options={anyFormatOptions}
              />
              <AudienceField
                audiences={props.audiences}
                form={form}
                name={`footer.${index}.audience`}
              />
            </div>
            <fieldset className="space-y-2 rounded-md border p-3">
              <legend className="text-strong px-1 text-sm font-medium">
                Comparison
              </legend>
              <p className="text-muted-foreground text-xs">
                Optional. Typed in and never recalculated, so name a fixed
                reference, e.g. vs 2021 Census.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field
                  as="select"
                  form={form}
                  label="Direction"
                  name={`footer.${index}.changeDirection`}
                  options={directionOptions}
                />
                <Field
                  as="select"
                  form={form}
                  label="Tone"
                  name={`footer.${index}.changeSentiment`}
                  options={sentimentOptions}
                />
                <Field
                  description="Optional. Leave empty to show only the direction."
                  form={form}
                  inputMode="decimal"
                  label="Change"
                  name={`footer.${index}.changeValue`}
                />
                <Field
                  as="select"
                  form={form}
                  label="Change format"
                  name={`footer.${index}.changeFormat`}
                  options={numericFormatOptions}
                />
                <Field
                  form={form}
                  label="Comparison label"
                  name={`footer.${index}.changeLabel`}
                />
              </div>
            </fieldset>
          </div>
        )}
        rowKeys={footer.fields.map((field) => field.id)}
        shown={shownFooter}
      />
    </ManualShell>
  );
}

function FieldTableForm(props: ManualFormProps<"field_table">) {
  const { form, ...submit } = useManualForm(
    "field_table",
    props,
    props.initial,
  );
  const rows = useFieldArray({ control: form.control, name: "rows" });
  const shown = useShownEntries(
    rows.fields,
    () => form.getValues("rows"),
    props.audienceFilter,
  );
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <fieldset className="space-y-2">
        <legend className="text-strong text-sm font-medium">
          Column headings
        </legend>
        <p className="text-muted-foreground text-xs">
          Leave all three empty for Field, Value and Notes.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field form={form} label="First heading" name="columns.0" />
          <Field form={form} label="Second heading" name="columns.1" />
          <Field form={form} label="Third heading" name="columns.2" />
        </div>
      </fieldset>
      <AudienceNote audiences={props.audiences} kind="summary" />
      <RowListEditor
        addLabel="Add row"
        count={rows.fields.length}
        error={arrayError(form.formState.errors.rows)}
        hasHiddenError={hasHiddenError(form.formState.errors.rows, shown)}
        legend="Rows"
        max={manualLimits.fieldRows}
        move={rows.move}
        noun="row"
        onAdd={() =>
          rows.append({
            ...emptyRow("field_table", form.getValues()),
            ...newRowAudience(props.audienceFilter),
          })
        }
        remove={rows.remove}
        renderRow={(index) => (
          <div className="grid gap-2">
            <Field form={form} label="Field" name={`rows.${index}.field`} />
            <Field form={form} label="Value" name={`rows.${index}.value`} />
            <Field
              as="textarea"
              form={form}
              label="Note"
              name={`rows.${index}.note`}
            />
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`rows.${index}.audience`}
            />
          </div>
        )}
        rowKeys={rows.fields.map((field) => field.id)}
        shown={shown}
      />
    </ManualShell>
  );
}

// Keeps every row's cells in step with the columns when a column is added,
// removed or moved, so cells stay under the column they were typed for.
function useCellColumns<
  Type extends "data_table" | "heatmap",
  Values extends ManualValues<Type> = ManualValues<Type>,
>(form: UseFormReturn<Values>) {
  const control = form.control as unknown as UseFormReturn<
    ManualValues<"heatmap">
  >["control"];
  const columns = useFieldArray({ control, name: "columns" });
  const rows = useFieldArray({ control, name: "rows" });
  // Data table rows also hold one status per column, reshaped the same way.
  const reshape = (change: <Cell>(cells: Cell[], blank: Cell) => Cell[]) =>
    rows.replace(
      (form.getValues() as ManualValues<"heatmap">).rows.map((row) => {
        const statuses = (row as { statuses?: StatusCell[] }).statuses;
        return {
          ...row,
          values: change([...row.values], ""),
          ...(statuses
            ? { statuses: change([...statuses], { code: "", label: "" }) }
            : {}),
        };
      }),
    );
  return {
    columns,
    rows,
    addColumn: (column: ManualValues<Type>["columns"][number]) => {
      columns.append(column as ManualValues<"heatmap">["columns"][number]);
      reshape((cells, blank) => [...cells, blank]);
    },
    removeColumn: (index: number) => {
      columns.remove(index);
      reshape((cells) => cells.filter((_, cell) => cell !== index));
    },
    moveColumn: (from: number, to: number) => {
      columns.move(from, to);
      reshape((cells, blank) => {
        const [moved] = cells.splice(from, 1);
        cells.splice(to, 0, moved ?? blank);
        return cells;
      });
    },
  };
}

function DataTableForm(props: ManualFormProps<"data_table">) {
  const { form, ...submit } = useManualForm("data_table", props, props.initial);
  const grid = useCellColumns<"data_table">(form);
  const columnValues = useWatch({ control: form.control, name: "columns" });
  const rowValues = useWatch({ control: form.control, name: "rows" });
  const errors = form.formState.errors;
  const shownColumns = useShownEntries(
    grid.columns.fields,
    () => form.getValues("columns"),
    props.audienceFilter,
    true,
  );
  const shownRows = useShownEntries(
    grid.rows.fields,
    () => form.getValues("rows"),
    props.audienceFilter,
  );
  // Text columns after the first can carry status chips; any column keeps
  // the chips it already has.
  const hasStatus = (rowIndex: number, columnIndex: number) =>
    (columnIndex > 0 && columnValues[columnIndex]?.format === "text") ||
    Boolean(rowValues[rowIndex]?.statuses[columnIndex]?.code);
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <RowListEditor
        addLabel="Add column"
        count={grid.columns.fields.length}
        description="The first column labels each row."
        error={arrayError(errors.columns)}
        hasHiddenError={hasHiddenError(errors.columns, shownColumns)}
        legend="Columns"
        max={manualLimits.dataColumns}
        move={grid.moveColumn}
        noun="column"
        onAdd={() =>
          grid.addColumn({
            key: "",
            label: "",
            format: "number",
            audience: "",
            ...newRowAudience(props.audienceFilter),
          })
        }
        remove={grid.removeColumn}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <Field
              form={form}
              label="Heading"
              name={`columns.${index}.label`}
            />
            <Field
              description="a–z, 0–9 and _."
              form={form}
              label="Key"
              name={`columns.${index}.key`}
            />
            <Field
              as="select"
              form={form}
              label="Format"
              name={`columns.${index}.format`}
              options={anyFormatOptions}
            />
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`columns.${index}.audience`}
            />
          </div>
        )}
        rowKeys={grid.columns.fields.map((field) => field.id)}
        shown={shownColumns}
      />
      <AudienceNote audiences={props.audiences} kind="breakdown" />
      <RowListEditor
        addLabel="Add row"
        count={grid.rows.fields.length}
        description="Leave a cell empty to show a dash. A text cell can also show a status chip."
        error={arrayError(errors.rows)}
        hasHiddenError={hasHiddenError(errors.rows, shownRows)}
        legend="Rows"
        max={manualLimits.dataRows}
        move={grid.rows.move}
        noun="row"
        onAdd={() =>
          grid.rows.append({
            ...emptyRow("data_table", form.getValues()),
            ...newRowAudience(props.audienceFilter),
          } as never)
        }
        remove={grid.rows.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`rows.${index}.audience`}
            />
            {columnValues.map((column, columnIndex) => {
              // Cells of hidden columns are kept as they are.
              if (!shownColumns.includes(columnIndex)) return null;
              const label = column.label.trim() || `Column ${columnIndex + 1}`;
              return (
                <div
                  className="space-y-2"
                  key={grid.columns.fields[columnIndex]?.id ?? columnIndex}
                >
                  <Field
                    form={form}
                    inputMode={column.format === "text" ? undefined : "decimal"}
                    label={label}
                    name={`rows.${index}.values.${columnIndex}`}
                  />
                  {hasStatus(index, columnIndex) && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field
                        as="select"
                        form={form}
                        label={`${label} status`}
                        name={`rows.${index}.statuses.${columnIndex}.code`}
                        options={cellStatusOptions}
                      />
                      <Field
                        description="Optional. Defaults to the status name."
                        form={form}
                        label={`${label} status label`}
                        name={`rows.${index}.statuses.${columnIndex}.label`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        rowKeys={grid.rows.fields.map((field) => field.id)}
        shown={shownRows}
      />
    </ManualShell>
  );
}

function HeatmapForm(props: ManualFormProps<"heatmap">) {
  const { form, ...submit } = useManualForm("heatmap", props, props.initial);
  const grid = useCellColumns<"heatmap">(form);
  const columnValues = useWatch({ control: form.control, name: "columns" });
  const errors = form.formState.errors;
  const shownRows = useShownEntries(
    grid.rows.fields,
    () => form.getValues("rows"),
    props.audienceFilter,
  );
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <RowListEditor
        addLabel="Add column"
        count={grid.columns.fields.length}
        error={arrayError(errors.columns)}
        legend="Columns"
        max={manualLimits.heatmapColumns}
        move={grid.moveColumn}
        noun="column"
        onAdd={() => grid.addColumn({ label: "" })}
        remove={grid.removeColumn}
        renderRow={(index) => (
          <Field form={form} label="Heading" name={`columns.${index}.label`} />
        )}
        rowKeys={grid.columns.fields.map((field) => field.id)}
      />
      <AudienceNote audiences={props.audiences} kind="breakdown" />
      <RowListEditor
        addLabel="Add row"
        count={grid.rows.fields.length}
        description="One number per column. Leave a cell empty for no value."
        error={arrayError(errors.rows)}
        hasHiddenError={hasHiddenError(errors.rows, shownRows)}
        legend="Rows"
        max={manualLimits.heatmapRows}
        move={grid.rows.move}
        noun="row"
        onAdd={() =>
          grid.rows.append({
            ...emptyRow("heatmap", form.getValues()),
            ...newRowAudience(props.audienceFilter),
          } as never)
        }
        remove={grid.rows.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field form={form} label="Row label" name={`rows.${index}.label`} />
            <AudienceField
              audiences={props.audiences}
              form={form}
              name={`rows.${index}.audience`}
            />
            {columnValues.map((column, columnIndex) => (
              <Field
                form={form}
                inputMode="decimal"
                key={grid.columns.fields[columnIndex]?.id ?? columnIndex}
                label={column.label.trim() || `Column ${columnIndex + 1}`}
                name={`rows.${index}.values.${columnIndex}`}
              />
            ))}
          </div>
        )}
        rowKeys={grid.rows.fields.map((field) => field.id)}
        shown={shownRows}
      />
    </ManualShell>
  );
}

function GaugeForm(props: ManualFormProps<"gauge">) {
  const { form, ...submit } = useManualForm("gauge", props, props.initial);
  const details = useFieldArray({ control: form.control, name: "details" });
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Field form={form} inputMode="decimal" label="Value" name="value" />
        <Field
          description="Leave empty for 100."
          form={form}
          inputMode="decimal"
          label="Maximum"
          name="max"
        />
        <Field
          as="select"
          form={form}
          label="Format"
          name="format"
          options={numericFormatOptions}
        />
      </div>
      <Field
        description="Optional. Shown with the value, e.g. Priority score."
        form={form}
        label="Label"
        name="label"
      />
      <fieldset className="space-y-2 rounded-md border p-3">
        <legend className="text-strong px-1 text-sm font-medium">Status</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field
            as="select"
            form={form}
            label="Status"
            name="status.code"
            options={gaugeStatusOptions}
          />
          <Field
            description="Optional. Defaults to the status name."
            form={form}
            label="Status label"
            name="status.label"
          />
        </div>
      </fieldset>
      <RowListEditor
        addLabel="Add detail"
        count={details.fields.length}
        description="Optional. Up to 6 values shown under the gauge."
        error={arrayError(form.formState.errors.details)}
        legend="Details"
        max={manualLimits.gaugeDetails}
        move={details.move}
        noun="detail"
        onAdd={() =>
          details.append(
            emptyRow(
              "gauge",
              form.getValues(),
            ) as ManualValues<"gauge">["details"][number],
          )
        }
        remove={details.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <Field form={form} label="Label" name={`details.${index}.label`} />
            <Field form={form} label="Value" name={`details.${index}.value`} />
            <Field
              as="select"
              form={form}
              label="Format"
              name={`details.${index}.format`}
              options={anyFormatOptions}
            />
          </div>
        )}
        rowKeys={details.fields.map((field) => field.id)}
      />
    </ManualShell>
  );
}

// One generic editor per render type, reused by every manual widget of it.
// `audiences` are offered as row tags on Marketing Intelligence widgets, and
// with an `audienceFilter` only the rows for those audiences are shown.
export function ManualDataForm({
  audienceFilter = [],
  audiences = [],
  ...inspectorProps
}: InspectorFormProps & {
  audienceFilter?: readonly string[];
  audiences?: readonly Audience[];
}) {
  // Every audience selected is no filter.
  const known = audienceFilter.filter((code) =>
    audiences.some((audience) => audience.code === code),
  );
  const props = {
    ...inspectorProps,
    audienceFilter: known.length === audiences.length ? [] : known,
    audiences,
  };
  const { item } = props;
  switch (item.type) {
    case "kpi_list":
      return (
        <KpiListForm {...props} initial={toManualValues("kpi_list", item)} />
      );
    case "bar_chart":
      return (
        <BarChartForm {...props} initial={toManualValues("bar_chart", item)} />
      );
    case "donut":
      return <DonutForm {...props} initial={toManualValues("donut", item)} />;
    case "progress_list":
      return (
        <ProgressListForm
          {...props}
          initial={toManualValues("progress_list", item)}
        />
      );
    case "field_table":
      return (
        <FieldTableForm
          {...props}
          initial={toManualValues("field_table", item)}
        />
      );
    case "data_table":
      return (
        <DataTableForm
          {...props}
          initial={toManualValues("data_table", item)}
        />
      );
    case "heatmap":
      return (
        <HeatmapForm {...props} initial={toManualValues("heatmap", item)} />
      );
    case "gauge":
      return <GaugeForm {...props} initial={toManualValues("gauge", item)} />;
    default:
      return null;
  }
}
