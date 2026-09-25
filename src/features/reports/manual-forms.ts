import { z } from "zod";

import { type ValueFormat, valueFormats } from "@/lib/formatters";

import type { LayoutItem, LayoutItemPatch } from "./contracts";

// Form models for the manual content editors, one per render type, and their
// conversion to the PATCH body. Limits mirror the API's `ContentRules`; the
// API stays the judge and its field errors map back through `fieldFor`.

export const manualTypes = [
  "kpi_list",
  "field_table",
  "progress_list",
  "donut",
  "bar_chart",
  "data_table",
  "heatmap",
] as const;
export type ManualType = (typeof manualTypes)[number];

export function hasManualEditor(type: string | null): type is ManualType {
  return type !== null && (manualTypes as readonly string[]).includes(type);
}

export const numericFormats = [
  "currency",
  "number",
  "percent",
  "multiplier",
] as const satisfies readonly ValueFormat[];
export const formatLabels: Record<ValueFormat, string> = {
  currency: "Currency",
  number: "Number",
  percent: "Percent",
  multiplier: "Multiplier (x)",
  text: "Text",
};

export const manualLimits = {
  kpiList: 20,
  barChart: 50,
  donutItems: 20,
  progressGroups: 10,
  progressItems: 50,
  progressFooter: 4,
  fieldRows: 50,
  dataColumns: 10,
  dataRows: 100,
  heatmapColumns: 12,
  heatmapRows: 30,
} as const;

const numberPattern = /^-?\d+(\.\d+)?$/;
const keyPattern = /^[A-Za-z0-9_-]+$/;
const columnKeyPattern = /^[a-z][a-z0-9_]*$/;

// "1,250.5" → 1250.5. Blank or malformed input is undefined.
export function parseAmount(value: string): number | undefined {
  const cleaned = value.trim().replace(/,/g, "");
  return numberPattern.test(cleaned) ? Number(cleaned) : undefined;
}

const text = (max: number, what: string) =>
  z.string().max(max, `Keep the ${what} to ${max} characters.`);
const required = (max: number, what: string) =>
  text(max, what).refine((value) => value.trim() !== "", `Enter the ${what}.`);
const amount = (what: string) =>
  z
    .string()
    .refine(
      (value) => parseAmount(value) !== undefined,
      `Enter the ${what} as a number.`,
    );
const optionalAmount = (what: string) =>
  z
    .string()
    .refine(
      (value) => value.trim() === "" || parseAmount(value) !== undefined,
      `Enter the ${what} as a number.`,
    );
const numericFormat = z.enum(numericFormats);
const anyFormat = z.enum(valueFormats);
const rows = <Schema extends z.ZodType>(
  schema: Schema,
  min: number,
  max: number,
  noun: string,
) =>
  z
    .array(schema)
    .min(min, `Add at least one ${noun}.`)
    .max(max, `Add up to ${max} ${noun}s.`);

const common = {
  title: text(150, "title"),
  subtitle: text(255, "subtitle"),
  as_of: z.union([z.literal(""), z.iso.date("Enter a valid date.")]),
};

// A value whose format is `text` is display text; any other must be numeric.
function checkValue(
  entry: { value: string; format: ValueFormat },
  path: (string | number)[],
  context: z.RefinementCtx,
) {
  if (entry.value.trim() === "")
    context.addIssue({ code: "custom", path, message: "Enter the value." });
  else if (entry.format === "text" && entry.value.length > 100)
    context.addIssue({
      code: "custom",
      path,
      message: "Keep the value to 100 characters.",
    });
  else if (entry.format !== "text" && parseAmount(entry.value) === undefined)
    context.addIssue({
      code: "custom",
      path,
      message: "Enter a number, or choose the Text format.",
    });
}

export const manualSchemas = {
  kpi_list: z.object({
    ...common,
    items: rows(
      z.object({
        label: required(100, "label"),
        value: required(100, "value"),
      }),
      1,
      manualLimits.kpiList,
      "row",
    ),
  }),
  bar_chart: z.object({
    ...common,
    items: rows(
      z.object({
        label: required(100, "label"),
        value: amount("value"),
        format: numericFormat,
      }),
      1,
      manualLimits.barChart,
      "bar",
    ),
  }),
  donut: z
    .object({
      ...common,
      center: z.object({
        label: text(100, "label"),
        value: z.string(),
        format: anyFormat,
      }),
      itemFormat: numericFormat,
      items: rows(
        z.object({
          label: required(100, "label"),
          value: amount("value").refine(
            (value) => (parseAmount(value) ?? 0) >= 0,
            "Enter a value of 0 or more.",
          ),
        }),
        1,
        manualLimits.donutItems,
        "segment",
      ),
    })
    .superRefine((values, context) => {
      const { center } = values;
      if (!center.label.trim() && !center.value.trim()) return;
      if (!center.label.trim())
        context.addIssue({
          code: "custom",
          path: ["center", "label"],
          message: "Enter the centre label, or clear the centre value.",
        });
      checkValue(center, ["center", "value"], context);
    }),
  progress_list: z
    .object({
      ...common,
      groups: z
        .array(
          z.object({
            key: required(60, "key").refine(
              (key) => keyPattern.test(key.trim()),
              "Use letters, numbers, - and _ only.",
            ),
            label: required(100, "label"),
          }),
        )
        .max(manualLimits.progressGroups, "Add up to 10 groups."),
      items: rows(
        z.object({
          group: z.string(),
          label: required(150, "label"),
          value: amount("value"),
          format: numericFormat,
          share: optionalAmount("share").refine((share) => {
            const parsed = parseAmount(share);
            return parsed === undefined || (parsed >= 0 && parsed <= 100);
          }, "Enter a share from 0 to 100."),
          secondaryLabel: text(100, "label"),
          secondaryValue: z.string(),
          secondaryFormat: anyFormat,
        }),
        1,
        manualLimits.progressItems,
        "row",
      ),
      footer: z
        .array(
          z.object({
            label: required(100, "label"),
            value: z.string(),
            format: anyFormat,
            // A change entered through the API is kept as it is.
            change: z.unknown(),
          }),
        )
        .max(manualLimits.progressFooter, "Add up to 4 totals."),
    })
    .superRefine((values, context) => {
      const keys = values.groups.map((group) => group.key.trim());
      keys.forEach((key, index) => {
        if (key && keys.indexOf(key) !== index)
          context.addIssue({
            code: "custom",
            path: ["groups", index, "key"],
            message: "Each group needs its own key.",
          });
      });
      values.items.forEach((item, index) => {
        if (keys.length > 0 && !keys.includes(item.group))
          context.addIssue({
            code: "custom",
            path: ["items", index, "group"],
            message: "Choose a group.",
          });
        const hasSecondary =
          item.secondaryLabel.trim() !== "" ||
          item.secondaryValue.trim() !== "";
        if (!hasSecondary) return;
        if (!item.secondaryLabel.trim())
          context.addIssue({
            code: "custom",
            path: ["items", index, "secondaryLabel"],
            message: "Enter the second label, or clear its value.",
          });
        checkValue(
          { value: item.secondaryValue, format: item.secondaryFormat },
          ["items", index, "secondaryValue"],
          context,
        );
      });
      values.footer.forEach((entry, index) =>
        checkValue(entry, ["footer", index, "value"], context),
      );
    }),
  field_table: z
    .object({
      ...common,
      columns: z.tuple([
        text(60, "heading"),
        text(60, "heading"),
        text(60, "heading"),
      ]),
      rows: rows(
        z.object({
          field: required(200, "field"),
          value: required(500, "value"),
          note: text(1000, "note"),
        }),
        1,
        manualLimits.fieldRows,
        "row",
      ),
    })
    .superRefine((values, context) => {
      // The headings are all or nothing; left empty, the API uses its own.
      if (values.columns.every((column) => column.trim() === "")) return;
      values.columns.forEach((column, index) => {
        if (!column.trim())
          context.addIssue({
            code: "custom",
            path: ["columns", index],
            message: "Enter all three headings, or none.",
          });
      });
    }),
  data_table: z
    .object({
      ...common,
      columns: rows(
        z.object({
          key: required(40, "key").refine(
            (key) => columnKeyPattern.test(key.trim()),
            "Start with a lowercase letter; use a–z, 0–9 and _ only.",
          ),
          label: required(100, "heading"),
          format: anyFormat,
        }),
        1,
        manualLimits.dataColumns,
        "column",
      ),
      rows: rows(
        z.object({ values: z.array(z.string()) }),
        1,
        manualLimits.dataRows,
        "row",
      ),
    })
    .superRefine((values, context) => {
      const keys = values.columns.map((column) => column.key.trim());
      keys.forEach((key, index) => {
        if (key && keys.indexOf(key) !== index)
          context.addIssue({
            code: "custom",
            path: ["columns", index, "key"],
            message: "Each column needs its own key.",
          });
      });
      values.rows.forEach((row, rowIndex) =>
        values.columns.forEach((column, columnIndex) => {
          const cell = row.values[columnIndex] ?? "";
          const path = ["rows", rowIndex, "values", columnIndex];
          if (column.format === "text" && cell.length > 500)
            context.addIssue({
              code: "custom",
              path,
              message: "Keep the cell to 500 characters.",
            });
          if (
            column.format !== "text" &&
            cell.trim() !== "" &&
            parseAmount(cell) === undefined
          )
            context.addIssue({
              code: "custom",
              path,
              message: "Enter a number, or leave it empty.",
            });
        }),
      );
    }),
  heatmap: z.object({
    ...common,
    columns: rows(
      z.object({ label: required(60, "heading") }),
      1,
      manualLimits.heatmapColumns,
      "column",
    ),
    rows: rows(
      z.object({
        label: required(100, "label"),
        values: z.array(optionalAmount("value")),
      }),
      1,
      manualLimits.heatmapRows,
      "row",
    ),
  }),
} satisfies Record<ManualType, z.ZodType>;

export type ManualValues<Type extends ManualType> = z.infer<
  (typeof manualSchemas)[Type]
>;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function string(value: unknown) {
  return typeof value === "string" ? value : "";
}
function display(value: unknown) {
  return typeof value === "number" ? String(value) : string(value);
}
function oneOf<Value extends string>(
  options: readonly Value[],
  value: unknown,
  fallback: Value,
): Value {
  return options.find((option) => option === value) ?? fallback;
}

function commonValues(item: LayoutItem) {
  return {
    title: string(item.settings.title),
    subtitle: string(item.settings.subtitle),
    as_of: item.as_of ?? "",
  };
}

// Stored content → form values. Missing or malformed content gives one empty
// row so the editor has somewhere to start.
export function toManualValues<Type extends ManualType>(
  type: Type,
  item: LayoutItem,
): ManualValues<Type> {
  const content = record(item.content);
  const base = commonValues(item);
  const values = {
    kpi_list: () => ({
      ...base,
      items: list(content.items).map((entry) => {
        const row = record(entry);
        return { label: string(row.label), value: display(row.value) };
      }),
    }),
    bar_chart: () => ({
      ...base,
      items: list(content.items).map((entry) => {
        const row = record(entry);
        return {
          label: string(row.label),
          value: display(row.value),
          format: oneOf(numericFormats, row.format, "number"),
        };
      }),
    }),
    donut: () => {
      const center = record(content.center);
      const items = list(content.items).map(record);
      return {
        ...base,
        center: {
          label: string(center.label),
          value: display(center.value),
          format: oneOf(valueFormats, center.format, "number"),
        },
        itemFormat: oneOf(numericFormats, items[0]?.format, "number"),
        items: items.map((row) => ({
          label: string(row.label),
          value: display(row.value),
        })),
      };
    },
    progress_list: () => ({
      ...base,
      groups: list(content.groups).map((entry) => {
        const group = record(entry);
        return { key: string(group.key), label: string(group.label) };
      }),
      items: list(content.items).map((entry) => {
        const row = record(entry);
        const secondary = record(row.secondary);
        return {
          group: string(row.group),
          label: string(row.label),
          value: display(row.value),
          format: oneOf(numericFormats, row.format, "number"),
          share: display(row.share),
          secondaryLabel: string(secondary.label),
          secondaryValue: display(secondary.value),
          secondaryFormat: oneOf(valueFormats, secondary.format, "number"),
        };
      }),
      footer: list(content.footer).map((entry) => {
        const kpi = record(entry);
        return {
          label: string(kpi.label),
          value: display(kpi.value),
          format: oneOf(valueFormats, kpi.format, "number"),
          change: kpi.change ?? null,
        };
      }),
    }),
    field_table: () => {
      const columns = list(content.columns).map(string);
      return {
        ...base,
        columns: [columns[0] ?? "", columns[1] ?? "", columns[2] ?? ""] as [
          string,
          string,
          string,
        ],
        rows: list(content.rows).map((entry) => {
          const row = record(entry);
          return {
            field: string(row.field),
            value: string(row.value),
            note: string(row.note),
          };
        }),
      };
    },
    data_table: () => {
      const columns = list(content.columns).map((entry) => {
        const column = record(entry);
        return {
          key: string(column.key),
          label: string(column.label),
          format: oneOf(valueFormats, column.format, "text"),
        };
      });
      return {
        ...base,
        columns,
        rows: list(content.rows).map((entry) => {
          const row = record(entry);
          return { values: columns.map((column) => display(row[column.key])) };
        }),
      };
    },
    heatmap: () => {
      const columns = list(content.columns).map((label) => ({
        label: string(label),
      }));
      return {
        ...base,
        columns,
        rows: list(content.rows).map((entry) => {
          const row = record(entry);
          const cells = list(row.values);
          return {
            label: string(row.label),
            values: columns.map((_, index) => display(cells[index])),
          };
        }),
      };
    },
  }[type]() as ManualValues<Type>;
  return withStarterRows(type, values);
}

type RowsKey<Type extends ManualType> = Type extends
  "field_table" | "data_table" | "heatmap"
  ? "rows"
  : "items";
export type ManualRow<Type extends ManualType> =
  ManualValues<Type>[RowsKey<Type> &
    keyof ManualValues<Type>] extends readonly (infer Row)[]
    ? Row
    : never;

export function emptyRow<Type extends ManualType>(
  type: Type,
  values: ManualValues<Type>,
): ManualRow<Type> {
  return blankRow(type, values) as ManualRow<Type>;
}

function blankRow(type: ManualType, values: ManualValues<ManualType>) {
  switch (type) {
    case "kpi_list":
      return { label: "", value: "" };
    case "bar_chart":
      return { label: "", value: "", format: "number" };
    case "donut":
      return { label: "", value: "" };
    case "progress_list": {
      const groups = (values as ManualValues<"progress_list">).groups;
      return {
        group: groups[0]?.key ?? "",
        label: "",
        value: "",
        format: "percent",
        share: "",
        secondaryLabel: "",
        secondaryValue: "",
        secondaryFormat: "number",
      };
    }
    case "field_table":
      return { field: "", value: "", note: "" };
    case "data_table":
      return {
        values: (values as ManualValues<"data_table">).columns.map(() => ""),
      };
    case "heatmap":
      return {
        label: "",
        values: (values as ManualValues<"heatmap">).columns.map(() => ""),
      };
  }
}

function withStarterRows<Type extends ManualType>(
  type: Type,
  values: ManualValues<Type>,
): ManualValues<Type> {
  const next = { ...values } as Record<string, unknown>;
  if (type === "data_table" || type === "heatmap") {
    const columns = next.columns as unknown[];
    if (columns.length === 0)
      next.columns =
        type === "data_table"
          ? [{ key: "", label: "", format: "text" }]
          : [{ label: "" }];
  }
  const rowsKey =
    type === "field_table" || type === "data_table" || type === "heatmap"
      ? "rows"
      : "items";
  if ((next[rowsKey] as unknown[]).length === 0)
    next[rowsKey] = [emptyRow(type, next as ManualValues<Type>)];
  return next as ManualValues<Type>;
}

function amountOrText(value: string, format: ValueFormat) {
  return format === "text" ? value.trim() : (parseAmount(value) ?? null);
}

function toContent<Type extends ManualType>(
  type: Type,
  values: ManualValues<Type>,
): Record<string, unknown> {
  switch (type) {
    case "kpi_list": {
      const form = values as ManualValues<"kpi_list">;
      // Manual KPI values are display text, e.g. "$65B+".
      return {
        items: form.items.map((row) => ({
          label: row.label.trim(),
          value: row.value.trim(),
          format: "text",
        })),
      };
    }
    case "bar_chart": {
      const form = values as ManualValues<"bar_chart">;
      return {
        items: form.items.map((row) => ({
          label: row.label.trim(),
          value: parseAmount(row.value) ?? null,
          format: row.format,
        })),
      };
    }
    case "donut": {
      const form = values as ManualValues<"donut">;
      const hasCenter = form.center.label.trim() || form.center.value.trim();
      return {
        center: hasCenter
          ? {
              label: form.center.label.trim(),
              value: amountOrText(form.center.value, form.center.format),
              format: form.center.format,
            }
          : null,
        // Keys and shares are worked out by the API from labels and values.
        items: form.items.map((row) => ({
          label: row.label.trim(),
          value: parseAmount(row.value) ?? null,
          format: form.itemFormat,
        })),
      };
    }
    case "progress_list": {
      const form = values as ManualValues<"progress_list">;
      const hasGroups = form.groups.length > 0;
      return {
        ...(hasGroups
          ? {
              groups: form.groups.map((group) => ({
                key: group.key.trim(),
                label: group.label.trim(),
              })),
            }
          : {}),
        items: form.items.map((row) => {
          const hasSecondary =
            row.secondaryLabel.trim() !== "" ||
            row.secondaryValue.trim() !== "";
          return {
            ...(hasGroups ? { group: row.group } : {}),
            label: row.label.trim(),
            value: parseAmount(row.value) ?? null,
            format: row.format,
            share: parseAmount(row.share) ?? null,
            secondary: hasSecondary
              ? {
                  label: row.secondaryLabel.trim(),
                  value: amountOrText(row.secondaryValue, row.secondaryFormat),
                  format: row.secondaryFormat,
                }
              : null,
          };
        }),
        ...(form.footer.length > 0
          ? {
              footer: form.footer.map((kpi) => ({
                label: kpi.label.trim(),
                value: amountOrText(kpi.value, kpi.format),
                format: kpi.format,
                change: kpi.change ?? null,
              })),
            }
          : {}),
      };
    }
    case "field_table": {
      const form = values as ManualValues<"field_table">;
      const hasColumns = form.columns.some((column) => column.trim() !== "");
      return {
        ...(hasColumns
          ? { columns: form.columns.map((column) => column.trim()) }
          : {}),
        rows: form.rows.map((row) => ({
          field: row.field.trim(),
          value: row.value.trim(),
          note: row.note.trim() || null,
        })),
      };
    }
    case "data_table": {
      const form = values as ManualValues<"data_table">;
      const columns = form.columns.map((column) => ({
        key: column.key.trim(),
        label: column.label.trim(),
        format: column.format,
      }));
      return {
        columns,
        rows: form.rows.map((row) =>
          Object.fromEntries(
            columns.map((column, index) => {
              const cell = row.values[index] ?? "";
              return [
                column.key,
                column.format === "text"
                  ? cell.trim() || null
                  : (parseAmount(cell) ?? null),
              ];
            }),
          ),
        ),
      };
    }
    case "heatmap": {
      const form = values as ManualValues<"heatmap">;
      return {
        columns: form.columns.map((column) => column.label.trim()),
        rows: form.rows.map((row) => ({
          label: row.label.trim(),
          values: form.columns.map(
            (_, index) => parseAmount(row.values[index] ?? "") ?? null,
          ),
        })),
      };
    }
  }
  return {};
}

export function manualPatch<Type extends ManualType>(
  type: Type,
  item: LayoutItem,
  values: ManualValues<Type>,
): LayoutItemPatch {
  // Settings replace the stored value, so other keys are carried over.
  const settings = { ...item.settings };
  delete settings.title;
  delete settings.subtitle;
  if (values.title.trim()) settings.title = values.title.trim();
  if (values.subtitle.trim()) settings.subtitle = values.subtitle.trim();
  return {
    settings: Object.keys(settings).length > 0 ? settings : null,
    content: toContent(type, values),
    as_of: values.as_of || null,
  };
}

const secondaryFields: Record<string, string> = {
  label: "secondaryLabel",
  value: "secondaryValue",
  format: "secondaryFormat",
};

// API field keys (`content.items.2.label`) → form fields. Keys that don't
// name a control land on the nearest one, so the message is still shown.
export function manualFieldForServerKey<Type extends ManualType>(
  type: Type,
  key: string,
  values: ManualValues<Type>,
): string | undefined {
  const [root, ...path] = key.split(".");
  if (root === "as_of") return "as_of";
  if (root === "settings") return path[0];
  if (root !== "content") return undefined;
  const [field, index, part, ...rest] = path;
  if (field === undefined) return undefined;
  if (index === undefined) return field;
  switch (type) {
    case "kpi_list":
      return `items.${index}.${part === "label" ? "label" : "value"}`;
    case "bar_chart":
      return `items.${index}.${part ?? "label"}`;
    case "donut":
      if (field === "center") return `center.${index}`;
      if (part === "format") return "itemFormat";
      return `items.${index}.${part === "value" ? "value" : "label"}`;
    case "progress_list":
      if (field === "groups") return `groups.${index}.${part ?? "key"}`;
      if (field === "footer")
        return `footer.${index}.${part === "label" || part === "format" ? part : "value"}`;
      if (part === "secondary")
        return `items.${index}.${secondaryFields[rest[0] ?? ""] ?? "secondaryLabel"}`;
      return `items.${index}.${part ?? "label"}`;
    case "field_table":
      if (field === "columns") return `columns.${index}`;
      return `rows.${index}.${part ?? "field"}`;
    case "data_table": {
      if (field === "columns") return `columns.${index}.${part ?? "key"}`;
      const columns = (values as ManualValues<"data_table">).columns;
      const column = columns.findIndex((entry) => entry.key.trim() === part);
      return column >= 0
        ? `rows.${index}.values.${column}`
        : `rows.${index}.values.0`;
    }
    case "heatmap":
      if (field === "columns") return `columns.${index}.label`;
      if (part === "values" && rest[0] !== undefined)
        return `rows.${index}.values.${rest[0]}`;
      return `rows.${index}.label`;
  }
  return undefined;
}
