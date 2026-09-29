"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

import type { Accent } from "./contracts";
import {
  sectionFormSchema,
  type SectionFormValues,
  sectionPatch,
  toSectionValues,
} from "./inspector-forms";
import {
  FormShell,
  type InspectorFormProps,
  useReportDirty,
  useSubmit,
} from "./inspector-parts";
import { itemTitle } from "./layout";

// API field keys (`settings.title`, `settings.accent`) → form fields.
function sectionFieldForServerKey(key: string) {
  if (key === "settings.title") return "title";
  if (key === "settings.accent") return "accent";
  return undefined;
}

// A section's title and its colour from the API's swatch list. The colour
// fills the active section tab and shades its sub-tabs, in the builder and
// the portal; widgets and charts keep their own colours.
export function SectionForm({
  accents,
  item,
  onDirtyChange,
  save,
  isSaving,
}: InspectorFormProps & { accents: readonly Accent[] }) {
  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: toSectionValues(item),
  });
  const { formError, onSubmit } = useSubmit(
    form,
    save,
    (values) => sectionPatch(item, values),
    sectionFieldForServerKey,
  );
  useReportDirty(form.formState.isDirty, onDirtyChange);
  const accent = useWatch({ control: form.control, name: "accent" });
  // An empty value shows the section's default as chosen.
  const selectedKey = accent || item.accent?.key;
  const defaultKey = item.accent?.is_default ? item.accent.key : undefined;
  const errors = form.formState.errors;

  return (
    <FormShell
      formError={formError}
      isDirty={form.formState.isDirty}
      isSaving={isSaving}
      label={`${itemTitle(item)} settings`}
      onSubmit={onSubmit}
    >
      <FormField
        error={errors.title?.message}
        id="inspector-title"
        label="Title"
      >
        <Input
          aria-invalid={Boolean(errors.title)}
          id="inspector-title"
          placeholder={item.default_title ?? undefined}
          {...form.register("title")}
        />
      </FormField>
      {accents.length > 0 && (
        <fieldset
          aria-describedby="inspector-accent-description"
          className="space-y-2"
        >
          <legend className="text-strong text-sm font-medium">Colour</legend>
          <p
            className="text-muted-foreground text-xs"
            id="inspector-accent-description"
          >
            Colours this section&apos;s tab and its sub-tabs in the portal.
          </p>
          {errors.accent?.message && (
            <p className="text-destructive text-xs font-medium" role="alert">
              {errors.accent.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {accents.map((swatch) => {
              const isChecked = swatch.key === selectedKey;
              const isDefault = swatch.key === defaultKey;
              return (
                <label className="relative cursor-pointer" key={swatch.key}>
                  <input
                    checked={isChecked}
                    className="peer sr-only"
                    name="inspector-accent"
                    onChange={() =>
                      form.setValue("accent", swatch.key, {
                        shouldDirty: true,
                      })
                    }
                    type="radio"
                    value={swatch.key}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "ring-offset-card flex size-8 items-center justify-center rounded-full ring-offset-2",
                      "peer-focus-visible:ring-ring peer-focus-visible:ring-2",
                      isChecked && "ring-strong ring-2",
                    )}
                    style={{ backgroundColor: swatch.base }}
                    title={
                      isDefault ? `${swatch.label} (default)` : swatch.label
                    }
                  >
                    {isChecked && <Check className="size-4 text-white" />}
                  </span>
                  <span className="sr-only">
                    {swatch.label}
                    {isDefault && " (default)"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </FormShell>
  );
}
