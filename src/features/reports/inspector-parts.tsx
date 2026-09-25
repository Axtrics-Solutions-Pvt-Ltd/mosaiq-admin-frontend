"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import type { ApiError } from "@/lib/api/errors";

import type { LayoutItem, LayoutItemPatch } from "./contracts";
import type { TitleFormValues } from "./inspector-forms";

// Building blocks shared by every inspector form.

export type SaveHandler = (
  patch: LayoutItemPatch,
) => Promise<ApiError | undefined>;

export type InspectorFormProps = {
  item: LayoutItem;
  onDirtyChange: (isDirty: boolean) => void;
  save: SaveHandler;
  isSaving: boolean;
};

// Saves the form and maps API field errors (`content.items.2.label`) onto the
// matching controls through `fieldFor`. Entered values stay in place.
export function useSubmit<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  save: SaveHandler,
  toPatch: (values: Values) => LayoutItemPatch,
  fieldFor: (key: string, values: Values) => string | undefined,
) {
  const [formError, setFormError] = useState("");
  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    const error = await save(toPatch(values));
    if (!error) {
      form.reset(values);
      return;
    }
    let isMapped = false;
    for (const [key, message] of Object.entries(error.fieldErrors)) {
      const field = fieldFor(key, values);
      if (field) {
        form.setError(field as Path<Values>, { type: "server", message });
        isMapped = true;
      }
    }
    setFormError(isMapped ? "Review the highlighted fields." : error.message);
  });
  return { formError, onSubmit };
}

export function useReportDirty(
  isDirty: boolean,
  onDirtyChange: (isDirty: boolean) => void,
) {
  // The builder asks before switching widgets while this form has edits.
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
}

export function TitleFields<Values extends TitleFormValues>({
  form,
  item,
}: {
  form: UseFormReturn<Values>;
  item: LayoutItem;
}) {
  // Every inspector form starts with these two fields; RHF can't narrow a
  // generic form to them, so the shared part is typed on its own.
  const register =
    form.register as unknown as UseFormReturn<TitleFormValues>["register"];
  const errors = form.formState
    .errors as UseFormReturn<TitleFormValues>["formState"]["errors"];
  return (
    <>
      <FormField
        error={errors.title?.message}
        id="inspector-title"
        label="Title"
      >
        <Input
          aria-invalid={Boolean(errors.title)}
          id="inspector-title"
          placeholder={item.default_title ?? undefined}
          {...register("title")}
        />
      </FormField>
      <FormField
        error={errors.subtitle?.message}
        id="inspector-subtitle"
        label="Subtitle"
      >
        <Input
          aria-invalid={Boolean(errors.subtitle)}
          id="inspector-subtitle"
          {...register("subtitle")}
        />
      </FormField>
    </>
  );
}

export function AsOfField<Values extends { as_of: string }>({
  form,
}: {
  form: UseFormReturn<Values>;
}) {
  const register = form.register as unknown as UseFormReturn<{
    as_of: string;
  }>["register"];
  const errors = form.formState.errors as UseFormReturn<{
    as_of: string;
  }>["formState"]["errors"];
  return (
    <FormField
      description="Shown as “As of …” on the widget. Leave empty to hide it."
      error={errors.as_of?.message}
      id="inspector-as-of"
      label="As of"
    >
      <Input
        aria-invalid={Boolean(errors.as_of)}
        id="inspector-as-of"
        type="date"
        {...register("as_of")}
      />
    </FormField>
  );
}

export function FormShell({
  children,
  formError,
  isDirty,
  isSaving,
  label,
  onSubmit,
}: {
  children: ReactNode;
  formError: string;
  isDirty: boolean;
  isSaving: boolean;
  label: string;
  onSubmit: () => void;
}) {
  return (
    <form
      aria-label={label}
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {formError && (
        <p
          className="text-destructive rounded-md border p-2 text-sm"
          role="alert"
        >
          {formError}
        </p>
      )}
      {children}
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <span className="text-muted-foreground text-xs">
          {isDirty ? "Unsaved changes" : "No unsaved changes"}
        </span>
        <Button disabled={isSaving || !isDirty} type="submit">
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function ListControls({
  count,
  index,
  label,
  move,
  remove,
}: {
  count: number;
  index: number;
  label: string;
  move: (from: number, to: number) => void;
  remove: (index: number) => void;
}) {
  return (
    <div className="flex shrink-0 gap-0.5">
      <Button
        aria-label={`Move ${label} up`}
        className="size-8"
        disabled={index === 0}
        onClick={() => move(index, index - 1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ArrowUp aria-hidden className="size-4" />
      </Button>
      <Button
        aria-label={`Move ${label} down`}
        className="size-8"
        disabled={index === count - 1}
        onClick={() => move(index, index + 1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ArrowDown aria-hidden className="size-4" />
      </Button>
      <Button
        aria-label={`Remove ${label}`}
        className="size-8"
        onClick={() => remove(index)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

// A list of rows edited in place: each row has ↑/↓/remove, and the list has
// an add button up to `max` rows.
export function RowListEditor({
  addLabel,
  count,
  description,
  error,
  legend,
  max,
  move,
  noun,
  onAdd,
  remove,
  renderRow,
  rowKeys,
}: {
  addLabel: string;
  count: number;
  description?: ReactNode;
  error?: string;
  legend: string;
  max: number;
  move: (from: number, to: number) => void;
  noun: string;
  onAdd: () => void;
  remove: (index: number) => void;
  renderRow: (index: number) => ReactNode;
  rowKeys: readonly string[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-strong text-sm font-medium">{legend}</legend>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
      {error && (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      )}
      {count > 0 && (
        <ol className="space-y-3">
          {rowKeys.map((key, index) => (
            <li className="space-y-2 rounded-md border p-3" key={key}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-strong text-sm font-medium capitalize">
                  {noun} {index + 1}
                </p>
                <ListControls
                  count={count}
                  index={index}
                  label={`${noun} ${index + 1}`}
                  move={move}
                  remove={remove}
                />
              </div>
              {renderRow(index)}
            </li>
          ))}
        </ol>
      )}
      <Button
        disabled={count >= max}
        onClick={onAdd}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus aria-hidden className="size-4" /> {addLabel}
      </Button>
    </fieldset>
  );
}
