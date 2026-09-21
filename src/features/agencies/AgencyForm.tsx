"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ImagePlus, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type FieldErrors, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { FormGrid, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { type TabOption, Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { routes } from "@/config/routes";
import { AgencyLogo } from "@/features/agencies/AgencyLogo";
import type {
  AgencyProfile,
  AgencyRecord,
} from "@/features/agencies/contracts";
import {
  useAgency,
  useCreateAgency,
  useUpdateAgency,
} from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/errors";

const formSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter an agency display name.")
    .max(255),
  legalName: z.string().max(255),
  description: z.string().max(5000),
  website: z.union([
    z.literal(""),
    z.url("Enter a valid website URL.").max(255),
  ]),
  status: z.enum(["active", "inactive"]),
  brandColor: z.union([
    z.literal(""),
    z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color."),
  ]),
  contactName: z.string().max(255),
  contactEmail: z.union([
    z.literal(""),
    z.email("Enter a valid email address.").max(255),
  ]),
  phone: z.string().max(50),
  jobTitle: z.string().max(255),
  currency: z.string().regex(/^[A-Z]{3}$/, "Choose a three-letter currency."),
  timeZone: z.string().min(1, "Choose a time zone."),
  language: z.string().max(16),
  reportingWeek: z.enum(["monday", "sunday"]),
  dateFormat: z.string().max(32),
});

type FormValues = z.infer<typeof formSchema>;

function initialValues(record?: AgencyRecord): FormValues {
  return {
    displayName: record?.display_name ?? "",
    legalName: record?.legal_name ?? "",
    description: record?.description ?? "",
    website: record?.website ?? "",
    status: record?.status ?? "active",
    brandColor: record?.brand_color ?? "#2563EB",
    contactName: record?.primary_contact.name ?? "",
    contactEmail: record?.primary_contact.email ?? "",
    phone: record?.primary_contact.phone ?? "",
    jobTitle: record?.primary_contact.job_title ?? "",
    currency: record?.defaults.currency ?? "USD",
    timeZone: record?.defaults.time_zone ?? "Europe/London",
    language: record?.defaults.language ?? "English (UK)",
    reportingWeek: record?.defaults.reporting_week_start ?? "monday",
    dateFormat: record?.defaults.date_format ?? "DD MMM YYYY",
  };
}

function payloadFromValues(values: FormValues): AgencyProfile {
  const nullable = (value: string) => value.trim() || null;
  return {
    display_name: values.displayName.trim(),
    legal_name: nullable(values.legalName),
    description: nullable(values.description),
    website: nullable(values.website),
    status: values.status,
    brand_color: nullable(values.brandColor),
    primary_contact: {
      name: nullable(values.contactName),
      email: nullable(values.contactEmail),
      phone: nullable(values.phone),
      job_title: nullable(values.jobTitle),
    },
    defaults: {
      currency: values.currency,
      time_zone: values.timeZone,
      language: values.language,
      reporting_week_start: values.reportingWeek,
      date_format: values.dateFormat,
    },
  };
}

const serverFields: Record<string, keyof FormValues> = {
  display_name: "displayName",
  legal_name: "legalName",
  description: "description",
  website: "website",
  status: "status",
  brand_color: "brandColor",
  "primary_contact.name": "contactName",
  "primary_contact.email": "contactEmail",
  "primary_contact.phone": "phone",
  "primary_contact.job_title": "jobTitle",
  "defaults.currency": "currency",
  "defaults.time_zone": "timeZone",
  "defaults.language": "language",
  "defaults.reporting_week_start": "reportingWeek",
  "defaults.date_format": "dateFormat",
};

export function AgencyForm({
  mode,
  record,
}: {
  mode: "create" | "edit";
  record?: AgencyRecord;
}) {
  const router = useRouter();
  const createMutation = useCreateAgency();
  const updateMutation = useUpdateAgency();
  const [submitError, setSubmitError] = useState("");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [tabVersion, setTabVersion] = useState(0);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues(record),
  });
  const values = useWatch({ control });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const backHref = record
    ? routes.agencies.detail(String(record.id))
    : routes.agencies.index;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  async function submit(values: FormValues) {
    setSubmitError("");
    try {
      const payload = payloadFromValues(values);
      const saved =
        mode === "create"
          ? await createMutation.mutateAsync(payload)
          : await updateMutation.mutateAsync({ agencyId: record!.id, payload });
      router.push(routes.agencies.detail(String(saved.id)));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [serverField, message] of Object.entries(
          error.fieldErrors,
        )) {
          const field = serverFields[serverField];
          if (field) setError(field, { type: "server", message });
        }
        setSubmitError(error.message);
      } else {
        setSubmitError("The agency could not be saved. Please try again.");
      }
      document.getElementById("agency-form-errors")?.focus();
    }
  }

  function invalid(formErrors: FieldErrors<FormValues>) {
    const first = Object.keys(formErrors)[0];
    const tab = ["contactName", "contactEmail", "phone", "jobTitle"].includes(
      first ?? "",
    )
      ? "contact"
      : [
            "currency",
            "timeZone",
            "language",
            "reportingWeek",
            "dateFormat",
          ].includes(first ?? "")
        ? "defaults"
        : first === "brandColor"
          ? "brand"
          : "overview";
    setActiveTab(tab);
    setTabVersion((current) => current + 1);
    setSubmitError("Review the highlighted fields.");
    document.getElementById("agency-form-errors")?.focus();
  }

  function textField(
    name: keyof FormValues,
    label: string,
    options: { required?: boolean; type?: string; placeholder?: string } = {},
  ) {
    return (
      <FormField
        id={name}
        label={label}
        required={options.required}
        error={errors[name]?.message}
      >
        <Input
          id={name}
          type={options.type}
          placeholder={options.placeholder}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          {...register(name)}
        />
      </FormField>
    );
  }

  const tabs: readonly TabOption[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGrid>
              {textField("displayName", "Display name", {
                required: true,
                placeholder: "Northstar Digital",
              })}
              {textField("legalName", "Legal name")}
              {textField("website", "Website", {
                type: "url",
                placeholder: "https://agency.example",
              })}
              <FormField
                id="status"
                label="Status"
                error={errors.status?.message}
              >
                <Select id="status" {...register("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </FormField>
              <div className="md:col-span-2">
                <FormField
                  id="description"
                  label="Description"
                  error={errors.description?.message}
                >
                  <Textarea id="description" {...register("description")} />
                </FormField>
              </div>
            </FormGrid>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "contact",
      label: "Primary contact",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Primary contact</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGrid>
              {textField("contactName", "Full name")}
              {textField("jobTitle", "Job title")}
              {textField("contactEmail", "Email", { type: "email" })}
              {textField("phone", "Phone", { type: "tel" })}
            </FormGrid>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "defaults",
      label: "Defaults",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Workspace defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGrid>
              <FormField
                id="currency"
                label="Default currency"
                error={errors.currency?.message}
              >
                <Select id="currency" {...register("currency")}>
                  {[
                    ...new Set([
                      "AUD",
                      "EUR",
                      "GBP",
                      "INR",
                      "USD",
                      values.currency,
                    ]),
                  ].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="timeZone"
                label="Time zone"
                error={errors.timeZone?.message}
              >
                <Select id="timeZone" {...register("timeZone")}>
                  {[
                    ...new Set([
                      "Europe/London",
                      "America/New_York",
                      "Asia/Kolkata",
                      "Australia/Sydney",
                      values.timeZone,
                    ]),
                  ].map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="language"
                label="Language"
                error={errors.language?.message}
              >
                <Select id="language" {...register("language")}>
                  {[
                    ...new Set([
                      "English (UK)",
                      "English (US)",
                      values.language,
                    ]),
                  ].map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="reportingWeek"
                label="Reporting week"
                error={errors.reportingWeek?.message}
              >
                <Select id="reportingWeek" {...register("reportingWeek")}>
                  <option value="monday">Monday to Sunday</option>
                  <option value="sunday">Sunday to Saturday</option>
                </Select>
              </FormField>
              <FormField
                id="dateFormat"
                label="Date format"
                error={errors.dateFormat?.message}
              >
                <Select id="dateFormat" {...register("dateFormat")}>
                  {[
                    ...new Set([
                      "DD MMM YYYY",
                      "MMM DD, YYYY",
                      "YYYY-MM-DD",
                      values.dateFormat,
                    ]),
                  ].map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormGrid>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "workspaces",
      label: "Workspaces",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {mode === "create"
                ? "Workspaces can be added after creating the agency."
                : `${record?.workspace_count ?? 0} linked workspaces. Manage them from the workspace area.`}
            </p>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "administrators",
      label: "Administrators",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Manage administrator access from Users and access.
            </p>
          </CardContent>
        </Card>
      ),
    },
    {
      value: "brand",
      label: "Brand preview",
      content: (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Agency logo</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="hover:border-primary flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center">
                <ImagePlus aria-hidden className="text-primary size-7" />
                <span className="text-strong mt-3 font-medium">
                  Choose a logo
                </span>
                <span className="text-muted-foreground mt-1 text-xs">
                  Local preview only; logo upload is not available in the agency
                  API.
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  className="sr-only"
                  onChange={(event) =>
                    setLogoName(event.target.files?.[0]?.name ?? "")
                  }
                />
              </label>
              {logoName && (
                <p className="text-muted-foreground mt-3 text-sm">
                  Selected locally: {logoName}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Brand preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg border p-5">
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <AgencyLogo
                      className="size-12"
                      name={values.displayName || "New agency"}
                      tone="blue"
                    />
                    <p className="text-strong font-semibold">
                      {values.displayName || "Agency name"}
                    </p>
                  </div>
                  <div className="bg-primary mt-5 h-2 rounded-full" />
                </div>
              </div>
              <div className="mt-4">
                {textField("brandColor", "Accent color", {
                  placeholder: "#2563EB",
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: "activity",
      label: "Recent activity",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {mode === "create"
                ? "Activity will appear after this agency is created."
                : "Review recorded activity on the agency details page."}
            </p>
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <PageStack>
      <PageHeader
        breadcrumbs={
          <>
            <Link className="hover:text-primary" href={routes.agencies.index}>
              Agencies
            </Link>
            <span aria-hidden> / </span>
            <span>
              {mode === "create" ? "New agency" : record?.display_name}
            </span>
          </>
        }
        description={
          mode === "create"
            ? "Define the agency profile, contact, defaults, and brand."
            : "Update the agency profile and defaults."
        }
        title={
          mode === "create"
            ? "Create agency"
            : `Edit ${record?.display_name ?? "agency"}`
        }
      />
      <form noValidate onSubmit={handleSubmit(submit, invalid)}>
        {submitError && (
          <div
            className="bg-destructive-soft text-destructive mb-4 flex gap-3 rounded-lg border p-4"
            id="agency-form-errors"
            role="alert"
            tabIndex={-1}
          >
            <AlertCircle aria-hidden className="size-5 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}
        <div className="bg-card overflow-hidden rounded-lg border p-4 sm:p-5">
          <div className="overflow-x-auto">
            <Tabs defaultValue={activeTab} items={tabs} key={tabVersion} />
          </div>
        </div>
        <div className="bg-card sticky bottom-0 z-10 mt-5 flex flex-col-reverse gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {isDirty
              ? "Unsaved changes"
              : "Changes are saved to the agency after submission."}
            {logoName ? " The selected logo stays local." : ""}
          </p>
          <div className="flex gap-2">
            {isDirty ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDiscarding(true)}
              >
                <ArrowLeft aria-hidden className="size-4" /> Cancel
              </Button>
            ) : (
              <Button asChild type="button" variant="outline">
                <Link href={backHref}>
                  <ArrowLeft aria-hidden className="size-4" /> Cancel
                </Link>
              </Button>
            )}
            <Button disabled={isPending} type="submit">
              <Save aria-hidden className="size-4" />{" "}
              {isPending
                ? "Saving..."
                : mode === "create"
                  ? "Create agency"
                  : "Save agency"}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        body="Your unsaved edits will be discarded."
        confirmLabel="Discard changes"
        description="Your edits have not been saved."
        isOpen={isDiscarding}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={() => {
          setIsDiscarding(false);
          router.push(backHref);
        }}
        title="Discard changes?"
      />
    </PageStack>
  );
}

export function AgencyEditScreen({ agencyId }: { agencyId: number }) {
  const query = useAgency(agencyId);
  const currentUser = useCurrentUser();
  if (!Number.isSafeInteger(agencyId) || agencyId <= 0)
    return (
      <StatePanel
        kind="error"
        title="Invalid agency"
        description="The agency link is invalid."
      />
    );
  if (query.isPending)
    return (
      <div aria-busy="true" className="p-8">
        Loading agency...
      </div>
    );
  if (query.isError)
    return (
      <StatePanel
        kind="error"
        title="Agency unavailable"
        description="The agency could not be loaded."
        action={<Button onClick={() => query.refetch()}>Try again</Button>}
      />
    );
  const canEdit =
    currentUser.data?.platformRoleCode === "SUPER_ADMIN" ||
    (currentUser.data?.membership?.roleCode === "AGENCY_ADMIN" &&
      currentUser.data.membership.agencyId === agencyId);
  if (!canEdit)
    return (
      <StatePanel
        kind="unavailable"
        title="Edit agency unavailable"
        description="You do not have permission to edit this agency."
      />
    );
  return <AgencyForm key={query.data.id} mode="edit" record={query.data} />;
}

export function AgencyCreateScreen() {
  const currentUser = useCurrentUser();
  if (currentUser.isPending)
    return (
      <div aria-busy="true" className="p-8">
        Loading account...
      </div>
    );
  if (currentUser.data?.platformRoleCode !== "SUPER_ADMIN")
    return (
      <StatePanel
        kind="unavailable"
        title="Create agency unavailable"
        description="Only a platform administrator can create agencies."
      />
    );
  return <AgencyForm mode="create" />;
}
