"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
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

import {
  AsOfField,
  FormShell,
  type InspectorFormProps,
  RowListEditor,
  TitleFields,
  useReportDirty,
  useSubmit,
} from "./inspector-parts";
import {
  emptyRow,
  formatLabels,
  manualFieldForServerKey,
  manualLimits,
  manualPatch,
  manualSchemas,
  type ManualType,
  type ManualValues,
  numericFormats,
  toManualValues,
} from "./manual-forms";
import { itemTitle } from "./StructurePanel";

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
  const { formError, onSubmit } = useSubmit(
    form,
    save,
    (values) => manualPatch(type, item, values),
    (key, values) => manualFieldForServerKey(type, key, values),
  );
  useReportDirty(form.formState.isDirty, onDirtyChange);
  return { form, formError, onSubmit };
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
  onSubmit,
}: {
  children: ReactNode;
  form: UseFormReturn<Values>;
  formError: string;
  isSaving: boolean;
  item: InspectorFormProps["item"];
  onSubmit: () => void;
}) {
  return (
    <FormShell
      formError={formError}
      isDirty={form.formState.isDirty}
      isSaving={isSaving}
      label={`${itemTitle(item)} content`}
      onSubmit={onSubmit}
    >
      <TitleFields form={form} item={item} />
      {children}
      <AsOfField form={form} />
    </FormShell>
  );
}

function KpiListForm(
  props: InspectorFormProps & {
    initial: ManualValues<"kpi_list">;
  },
) {
  const { form, ...submit } = useManualForm("kpi_list", props, props.initial);
  const items = useFieldArray({ control: form.control, name: "items" });
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <RowListEditor
        addLabel="Add row"
        count={items.fields.length}
        description="Values are shown exactly as typed, e.g. 1.8M or $65B+."
        error={arrayError(form.formState.errors.items)}
        legend="Rows"
        max={manualLimits.kpiList}
        move={items.move}
        noun="row"
        onAdd={() => items.append(emptyRow("kpi_list", form.getValues()))}
        remove={items.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field form={form} label="Label" name={`items.${index}.label`} />
            <Field form={form} label="Value" name={`items.${index}.value`} />
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
      />
    </ManualShell>
  );
}

function BarChartForm(
  props: InspectorFormProps & {
    initial: ManualValues<"bar_chart">;
  },
) {
  const { form, ...submit } = useManualForm("bar_chart", props, props.initial);
  const items = useFieldArray({ control: form.control, name: "items" });
  return (
    <ManualShell
      {...submit}
      form={form}
      isSaving={props.isSaving}
      item={props.item}
    >
      <RowListEditor
        addLabel="Add bar"
        count={items.fields.length}
        error={arrayError(form.formState.errors.items)}
        legend="Bars"
        max={manualLimits.barChart}
        move={items.move}
        noun="bar"
        onAdd={() =>
          items.append(
            emptyRow(
              "bar_chart",
              form.getValues(),
            ) as ManualValues<"bar_chart">["items"][number],
          )
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
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
      />
    </ManualShell>
  );
}

function DonutForm(
  props: InspectorFormProps & {
    initial: ManualValues<"donut">;
  },
) {
  const { form, ...submit } = useManualForm("donut", props, props.initial);
  const items = useFieldArray({ control: form.control, name: "items" });
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
      <RowListEditor
        addLabel="Add segment"
        count={items.fields.length}
        description="Shares are worked out from the values."
        error={arrayError(form.formState.errors.items)}
        legend="Segments"
        max={manualLimits.donutItems}
        move={items.move}
        noun="segment"
        onAdd={() => items.append(emptyRow("donut", form.getValues()))}
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
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
      />
    </ManualShell>
  );
}

function ProgressListForm(
  props: InspectorFormProps & {
    initial: ManualValues<"progress_list">;
  },
) {
  const { form, ...submit } = useManualForm(
    "progress_list",
    props,
    props.initial,
  );
  const groups = useFieldArray({ control: form.control, name: "groups" });
  const items = useFieldArray({ control: form.control, name: "items" });
  const footer = useFieldArray({ control: form.control, name: "footer" });
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
      <RowListEditor
        addLabel="Add row"
        count={items.fields.length}
        error={arrayError(errors.items)}
        legend="Rows"
        max={manualLimits.progressItems}
        move={items.move}
        noun="row"
        onAdd={() =>
          items.append(
            emptyRow(
              "progress_list",
              form.getValues(),
            ) as ManualValues<"progress_list">["items"][number],
          )
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
          </div>
        )}
        rowKeys={items.fields.map((field) => field.id)}
      />
      <RowListEditor
        addLabel="Add total"
        count={footer.fields.length}
        description="Optional totals under the list, e.g. a readiness score."
        error={arrayError(errors.footer)}
        legend="Footer"
        max={manualLimits.progressFooter}
        move={footer.move}
        noun="total"
        onAdd={() =>
          footer.append({
            label: "",
            value: "",
            format: "number",
            change: null,
          })
        }
        remove={footer.remove}
        renderRow={(index) => (
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
          </div>
        )}
        rowKeys={footer.fields.map((field) => field.id)}
      />
    </ManualShell>
  );
}

function FieldTableForm(
  props: InspectorFormProps & {
    initial: ManualValues<"field_table">;
  },
) {
  const { form, ...submit } = useManualForm(
    "field_table",
    props,
    props.initial,
  );
  const rows = useFieldArray({ control: form.control, name: "rows" });
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
      <RowListEditor
        addLabel="Add row"
        count={rows.fields.length}
        error={arrayError(form.formState.errors.rows)}
        legend="Rows"
        max={manualLimits.fieldRows}
        move={rows.move}
        noun="row"
        onAdd={() => rows.append(emptyRow("field_table", form.getValues()))}
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
          </div>
        )}
        rowKeys={rows.fields.map((field) => field.id)}
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
  const reshape = (change: (cells: string[]) => string[]) =>
    rows.replace(
      (form.getValues() as ManualValues<"heatmap">).rows.map((row) => ({
        ...row,
        values: change([...row.values]),
      })),
    );
  return {
    columns,
    rows,
    addColumn: (column: ManualValues<Type>["columns"][number]) => {
      columns.append(column as ManualValues<"heatmap">["columns"][number]);
      reshape((cells) => [...cells, ""]);
    },
    removeColumn: (index: number) => {
      columns.remove(index);
      reshape((cells) => cells.filter((_, cell) => cell !== index));
    },
    moveColumn: (from: number, to: number) => {
      columns.move(from, to);
      reshape((cells) => {
        const [moved] = cells.splice(from, 1);
        cells.splice(to, 0, moved ?? "");
        return cells;
      });
    },
  };
}

function DataTableForm(
  props: InspectorFormProps & {
    initial: ManualValues<"data_table">;
  },
) {
  const { form, ...submit } = useManualForm("data_table", props, props.initial);
  const grid = useCellColumns<"data_table">(form);
  const columnValues = useWatch({ control: form.control, name: "columns" });
  const errors = form.formState.errors;
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
        legend="Columns"
        max={manualLimits.dataColumns}
        move={grid.moveColumn}
        noun="column"
        onAdd={() => grid.addColumn({ key: "", label: "", format: "number" })}
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
          </div>
        )}
        rowKeys={grid.columns.fields.map((field) => field.id)}
      />
      <RowListEditor
        addLabel="Add row"
        count={grid.rows.fields.length}
        description="Leave a cell empty to show a dash."
        error={arrayError(errors.rows)}
        legend="Rows"
        max={manualLimits.dataRows}
        move={grid.rows.move}
        noun="row"
        onAdd={() =>
          grid.rows.append({ values: columnValues.map(() => "") } as never)
        }
        remove={grid.rows.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            {columnValues.map((column, columnIndex) => (
              <Field
                form={form}
                inputMode={column.format === "text" ? undefined : "decimal"}
                key={grid.columns.fields[columnIndex]?.id ?? columnIndex}
                label={column.label.trim() || `Column ${columnIndex + 1}`}
                name={`rows.${index}.values.${columnIndex}`}
              />
            ))}
          </div>
        )}
        rowKeys={grid.rows.fields.map((field) => field.id)}
      />
    </ManualShell>
  );
}

function HeatmapForm(
  props: InspectorFormProps & {
    initial: ManualValues<"heatmap">;
  },
) {
  const { form, ...submit } = useManualForm("heatmap", props, props.initial);
  const grid = useCellColumns<"heatmap">(form);
  const columnValues = useWatch({ control: form.control, name: "columns" });
  const errors = form.formState.errors;
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
      <RowListEditor
        addLabel="Add row"
        count={grid.rows.fields.length}
        description="One number per column. Leave a cell empty for no value."
        error={arrayError(errors.rows)}
        legend="Rows"
        max={manualLimits.heatmapRows}
        move={grid.rows.move}
        noun="row"
        onAdd={() =>
          grid.rows.append(emptyRow("heatmap", form.getValues()) as never)
        }
        remove={grid.rows.remove}
        renderRow={(index) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field form={form} label="Row label" name={`rows.${index}.label`} />
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
      />
    </ManualShell>
  );
}

// One generic editor per render type, reused by every manual widget of it.
export function ManualDataForm(props: InspectorFormProps) {
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
    default:
      return null;
  }
}
