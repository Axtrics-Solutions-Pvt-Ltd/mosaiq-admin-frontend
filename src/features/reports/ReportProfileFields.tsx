"use client";

import type { UseFormReturn } from "react-hook-form";

import { FormGrid } from "@/components/shared/LayoutPatterns";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

import {
  rangePresetLabels,
  rangePresets,
  type ReportProfileForm,
} from "./contracts";

const commonCurrencies = ["AUD", "CAD", "EUR", "GBP", "INR", "USD"];
const commonTimezones = [
  "Europe/London",
  "America/New_York",
  "America/Toronto",
  "Asia/Kolkata",
  "Australia/Sydney",
];

function uniqueOptions(values: readonly (string | undefined)[]) {
  return values.filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index,
  );
}

const describedBy = (id: string, hasError: boolean, hasHint = false) =>
  hasError ? `${id}-error` : hasHint ? `${id}-description` : undefined;

// Name, default range, currency and time zone; status only once the report
// exists. Extra currencies and zones (the agency's, the sources') are added
// to the common choices.
export function ReportProfileFields({
  extraCurrencies = [],
  extraTimezones = [],
  form,
  mode,
}: {
  extraCurrencies?: readonly string[];
  extraTimezones?: readonly string[];
  form: UseFormReturn<ReportProfileForm>;
  mode: "create" | "edit";
}) {
  const {
    register,
    formState: { errors },
  } = form;
  const currencyHint = "Every source workspace must use this currency.";
  return (
    <FormGrid>
      <div className="md:col-span-2">
        <FormField
          error={errors.name?.message}
          id="report-name"
          label="Report name"
          required
        >
          <Input
            aria-describedby={describedBy("report-name", Boolean(errors.name))}
            aria-invalid={Boolean(errors.name)}
            id="report-name"
            placeholder="Q3 performance"
            {...register("name")}
          />
        </FormField>
      </div>
      {mode === "edit" && (
        <FormField
          description="Archived reports keep their links, but the links stop working."
          error={errors.status?.message}
          id="report-status"
          label="Status"
        >
          <Select
            aria-describedby={describedBy(
              "report-status",
              Boolean(errors.status),
              true,
            )}
            id="report-status"
            {...register("status")}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </FormField>
      )}
      <FormField
        description="The range the portal opens with."
        error={errors.default_range_preset?.message}
        id="report-range"
        label="Default date range"
      >
        <Select
          aria-describedby={describedBy(
            "report-range",
            Boolean(errors.default_range_preset),
            true,
          )}
          id="report-range"
          {...register("default_range_preset")}
        >
          {rangePresets.map((preset) => (
            <option key={preset} value={preset}>
              {rangePresetLabels[preset]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        description={currencyHint}
        error={errors.currency?.message}
        id="report-currency"
        label="Currency"
      >
        <Select
          aria-describedby={describedBy(
            "report-currency",
            Boolean(errors.currency),
            true,
          )}
          aria-invalid={Boolean(errors.currency)}
          id="report-currency"
          {...register("currency")}
        >
          {uniqueOptions([...extraCurrencies, ...commonCurrencies]).map(
            (currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ),
          )}
        </Select>
      </FormField>
      <FormField
        error={errors.timezone?.message}
        id="report-timezone"
        label="Time zone"
      >
        <Select
          aria-describedby={describedBy(
            "report-timezone",
            Boolean(errors.timezone),
          )}
          id="report-timezone"
          {...register("timezone")}
        >
          {uniqueOptions([...extraTimezones, ...commonTimezones]).map(
            (timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ),
          )}
        </Select>
      </FormField>
    </FormGrid>
  );
}

export const profileFieldNames = [
  "name",
  "status",
  "default_range_preset",
  "currency",
  "timezone",
] as const;
