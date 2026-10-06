"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useState,
} from "react";
import {
  type FieldValues,
  type Path,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";

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

// Lets the builder save the open form from its unsaved-changes dialog.
export type InspectorFormHandle = {
  // Resolves true once saved; false leaves the form showing its errors.
  submit: () => Promise<boolean>;
};

// The builder's hold on whichever form the inspector shows: the form's
// unsaved edits for the canvas preview, and a handle to save it.
export const InspectorFormContext = createContext<{
  onDraftChange?: (patch: LayoutItemPatch | undefined) => void;
  formRef?: Ref<InspectorFormHandle>;
}>({});

// Saves the form and maps API field errors (`content.items.2.label`) onto the
// matching controls through `fieldFor`. Entered values stay in place.
export function useSubmit<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  save: SaveHandler,
  toPatch: (values: Values) => LayoutItemPatch,
  fieldFor: (key: string, values: Values) => string | undefined,
) {
  const [formError, setFormError] = useState("");
  const { formRef, onDraftChange } = useContext(InspectorFormContext);
  const saveValues = async (values: Values) => {
    setFormError("");
    const error = await save(toPatch(values));
    if (!error) {
      form.reset(values);
      return true;
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
    return false;
  };
  const onSubmit = form.handleSubmit(async (values) => {
    await saveValues(values);
  });
  useImperativeHandle(formRef, () => ({
    submit: async () => {
      let isSaved = false;
      await form.handleSubmit(async (values) => {
        isSaved = await saveValues(values);
      })();
      return isSaved;
    },
  }));

  // Every edit goes to the canvas preview while the form has unsaved edits.
  const values = useWatch({ control: form.control });
  const isDirty = form.formState.isDirty;
  const publishDraft = useEffectEvent(() =>
    onDraftChange?.(isDirty ? toPatch(form.getValues()) : undefined),
  );
  useEffect(() => publishDraft(), [values, isDirty]);
  const clearDraft = useEffectEvent(() => onDraftChange?.(undefined));
  useEffect(() => () => clearDraft(), []);

  // Back to the last saved values: the stored ones, or those of the last save.
  const onDiscard = () => {
    setFormError("");
    form.reset();
  };
  return { formError, onDiscard, onSubmit };
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
  onDiscard,
  onSubmit,
  previewNote,
  saveLabel = "Save",
}: {
  children: ReactNode;
  formError: string;
  isDirty: boolean;
  isSaving: boolean;
  label: string;
  onDiscard: () => void;
  onSubmit: () => void;
  // Shown with unsaved edits the canvas can't preview in full.
  previewNote?: string;
  saveLabel?: string;
}) {
  return (
    <form
      aria-label={label}
      className="space-y-4"
      noValidate
      onKeyDown={(event) => {
        // Ctrl/Cmd+S saves instead of opening the browser's save dialog.
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          if (isDirty && !isSaving) onSubmit();
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
      {/* Pinned to the bottom of the inspector's scroll area, so saving never
          needs a scroll past a long list. -bottom-4 and -mx-4 cancel the
          panel's padding, as the inspector's sticky header does at the top. */}
      <div className="bg-card sticky -bottom-4 z-10 -mx-4 space-y-2 border-t px-4 py-3">
        {formError && (
          <p
            className="text-destructive rounded-md border p-2 text-sm"
            role="alert"
          >
            {formError}
          </p>
        )}
        {isDirty && previewNote && (
          <p className="text-muted-foreground text-xs">{previewNote}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {isDirty && (
              <span aria-hidden className="bg-warning size-2 rounded-full" />
            )}
            {isDirty ? "Unsaved changes" : "No unsaved changes"}
          </span>
          <div className="flex shrink-0 gap-2 whitespace-nowrap">
            <Button
              disabled={isSaving || !isDirty}
              onClick={onDiscard}
              type="button"
              variant="ghost"
            >
              Discard
            </Button>
            <Button disabled={isSaving || !isDirty} type="submit">
              {isSaving ? "Saving..." : saveLabel}
            </Button>
          </div>
        </div>
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
// an add button up to `max` rows. `shown` (indexes, in order) limits the rows
// on screen, e.g. to the builder's audience filter: the others stay in the
// form and are saved as they are, and ↑/↓ move a row past the next shown one.
export function RowListEditor({
  addLabel,
  count,
  description,
  error,
  hasHiddenError = false,
  legend,
  max,
  move,
  noun,
  onAdd,
  remove,
  renderRow,
  rowKeys,
  shown,
}: {
  addLabel: string;
  count: number;
  description?: ReactNode;
  error?: string;
  // A row that isn't shown has an error, so it can't be fixed from here.
  hasHiddenError?: boolean;
  legend: string;
  max: number;
  move: (from: number, to: number) => void;
  noun: string;
  onAdd: () => void;
  remove: (index: number) => void;
  renderRow: (index: number) => ReactNode;
  rowKeys: readonly string[];
  shown?: readonly number[];
}) {
  const visible = shown ?? rowKeys.map((_, index) => index);
  const hidden = rowKeys.length - visible.length;
  const at = (position: number) => visible[position] ?? position;
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
      {hidden > 0 && (
        <p
          className={
            hasHiddenError
              ? "text-destructive text-xs font-medium"
              : "text-muted-foreground text-xs"
          }
          role={hasHiddenError ? "alert" : undefined}
        >
          {hidden === 1
            ? `1 ${noun} for other audiences is hidden and will be kept.`
            : `${hidden} ${noun}s for other audiences are hidden and will be kept.`}{" "}
          {hasHiddenError
            ? "One of them has an error: clear the audience filter to fix it."
            : "Clear the audience filter to see them."}
        </p>
      )}
      {count > 0 && visible.length > 0 && (
        <ol className="space-y-3">
          {visible.map((index, position) => (
            <li
              className="space-y-2 rounded-md border p-3"
              key={rowKeys[index] ?? index}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-strong text-sm font-medium capitalize">
                  {noun} {position + 1}
                </p>
                <ListControls
                  count={visible.length}
                  index={position}
                  label={`${noun} ${position + 1}`}
                  move={(from, to) => move(at(from), at(to))}
                  remove={(row) => remove(at(row))}
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
