"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Save,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { FormGrid, PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { type TabOption, Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { routes } from "@/config/routes";
import { AgencyLogo } from "@/features/agencies/AgencyLogo";
import type { AgencyDetail } from "@/features/agencies/view-model";

type SaveState = "ready" | "pending" | "error" | "success";

const blankValues = {
  brandColor: "#2563EB",
  contactEmail: "",
  contactName: "",
  currency: "USD",
  dateFormat: "DD MMM YYYY",
  description: "",
  displayName: "",
  jobTitle: "",
  language: "English (UK)",
  legalName: "",
  phone: "",
  reportingWeek: "Monday to Sunday",
  status: "active",
  timeZone: "Europe/London (UTC+00:00)",
  website: "",
};

export function AgencyForm({
  agency,
  mode,
}: {
  agency?: AgencyDetail;
  mode: "create" | "edit";
}) {
  const [values, setValues] = useState(() =>
    agency
      ? {
          brandColor: agency.brandColor,
          contactEmail: agency.primaryContact.email,
          contactName: agency.primaryContact.name,
          currency: agency.currency,
          dateFormat: agency.dateFormat,
          description: agency.description,
          displayName: agency.displayName,
          jobTitle: agency.primaryContact.jobTitle,
          language: agency.language,
          legalName: agency.legalName,
          phone: agency.primaryContact.phone,
          reportingWeek: agency.reportingWeek,
          status: agency.status,
          timeZone: agency.timeZone,
          website: agency.website,
        }
      : blankValues,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("ready");

  function update(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setIsDirty(true);
    setSaveState("ready");
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.displayName.trim())
      nextErrors.displayName = "Enter an agency display name.";
    if (!values.legalName.trim())
      nextErrors.legalName = "Enter the registered legal name.";
    if (!values.contactName.trim())
      nextErrors.contactName = "Enter a primary contact.";
    if (!values.contactEmail.includes("@"))
      nextErrors.contactEmail = "Enter a valid email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSaveState("error");
      document.getElementById("agency-form-errors")?.focus();
      return;
    }
    setSaveState("success");
    setIsDirty(false);
  }

  const overview = (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <FormGrid>
          <FormField
            error={errors.displayName}
            id="displayName"
            label="Display name"
            required
          >
            <Input
              aria-describedby={
                errors.displayName ? "displayName-error" : undefined
              }
              aria-invalid={Boolean(errors.displayName)}
              id="displayName"
              onChange={(event) => update("displayName", event.target.value)}
              placeholder="Northstar Digital"
              value={values.displayName}
            />
          </FormField>
          <FormField
            error={errors.legalName}
            id="legalName"
            label="Legal name"
            required
          >
            <Input
              aria-describedby={
                errors.legalName ? "legalName-error" : undefined
              }
              aria-invalid={Boolean(errors.legalName)}
              id="legalName"
              onChange={(event) => update("legalName", event.target.value)}
              placeholder="Northstar Digital Ltd"
              value={values.legalName}
            />
          </FormField>
          <FormField id="website" label="Website">
            <Input
              id="website"
              onChange={(event) => update("website", event.target.value)}
              placeholder="https://agency.example"
              type="url"
              value={values.website}
            />
          </FormField>
          <FormField id="status" label="Status">
            <Select
              id="status"
              onChange={(event) => update("status", event.target.value)}
              value={values.status}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField id="description" label="Description">
              <Textarea
                id="description"
                onChange={(event) => update("description", event.target.value)}
                placeholder="Describe the agency and the clients it serves."
                value={values.description}
              />
            </FormField>
          </div>
        </FormGrid>
      </CardContent>
    </Card>
  );

  const contact = (
    <Card>
      <CardHeader>
        <CardTitle>Primary contact</CardTitle>
      </CardHeader>
      <CardContent>
        <FormGrid>
          <FormField
            error={errors.contactName}
            id="contactName"
            label="Full name"
            required
          >
            <Input
              aria-describedby={
                errors.contactName ? "contactName-error" : undefined
              }
              aria-invalid={Boolean(errors.contactName)}
              id="contactName"
              onChange={(event) => update("contactName", event.target.value)}
              value={values.contactName}
            />
          </FormField>
          <FormField id="jobTitle" label="Job title">
            <Input
              id="jobTitle"
              onChange={(event) => update("jobTitle", event.target.value)}
              value={values.jobTitle}
            />
          </FormField>
          <FormField
            error={errors.contactEmail}
            id="contactEmail"
            label="Email"
            required
          >
            <Input
              aria-describedby={
                errors.contactEmail ? "contactEmail-error" : undefined
              }
              aria-invalid={Boolean(errors.contactEmail)}
              id="contactEmail"
              onChange={(event) => update("contactEmail", event.target.value)}
              type="email"
              value={values.contactEmail}
            />
          </FormField>
          <FormField id="phone" label="Phone">
            <Input
              id="phone"
              onChange={(event) => update("phone", event.target.value)}
              type="tel"
              value={values.phone}
            />
          </FormField>
        </FormGrid>
      </CardContent>
    </Card>
  );

  const defaults = (
    <Card>
      <CardHeader>
        <CardTitle>Workspace defaults</CardTitle>
      </CardHeader>
      <CardContent>
        <FormGrid>
          <FormField id="currency" label="Default currency">
            <Select
              id="currency"
              onChange={(event) => update("currency", event.target.value)}
              value={values.currency}
            >
              {["AUD", "EUR", "GBP", "INR", "USD"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </FormField>
          <FormField id="timeZone" label="Time zone">
            <Select
              id="timeZone"
              onChange={(event) => update("timeZone", event.target.value)}
              value={values.timeZone}
            >
              <option>Europe/London (UTC+00:00)</option>
              <option>America/New_York (UTC-05:00)</option>
              <option>Asia/Kolkata (UTC+05:30)</option>
              <option>Australia/Sydney (UTC+10:00)</option>
            </Select>
          </FormField>
          <FormField id="language" label="Language">
            <Select
              id="language"
              onChange={(event) => update("language", event.target.value)}
              value={values.language}
            >
              <option>English (UK)</option>
              <option>English (US)</option>
            </Select>
          </FormField>
          <FormField id="reportingWeek" label="Reporting week">
            <Select
              id="reportingWeek"
              onChange={(event) => update("reportingWeek", event.target.value)}
              value={values.reportingWeek}
            >
              <option>Monday to Sunday</option>
              <option>Sunday to Saturday</option>
            </Select>
          </FormField>
          <FormField id="dateFormat" label="Date format">
            <Select
              id="dateFormat"
              onChange={(event) => update("dateFormat", event.target.value)}
              value={values.dateFormat}
            >
              <option>DD MMM YYYY</option>
              <option>MMM DD, YYYY</option>
              <option>YYYY-MM-DD</option>
            </Select>
          </FormField>
        </FormGrid>
      </CardContent>
    </Card>
  );

  const brand = (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Agency logo</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="hover:border-primary flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center">
            <ImagePlus aria-hidden className="text-primary size-7" />
            <span className="text-strong mt-3 font-medium">Choose a logo</span>
            <span className="text-muted-foreground mt-1 text-xs">
              PNG, JPG, or SVG · preview only
            </span>
            <input
              accept=".png,.jpg,.jpeg,.svg"
              className="sr-only"
              onChange={(event) => {
                setLogoName(event.target.files?.[0]?.name ?? "");
                setIsDirty(true);
              }}
              type="file"
            />
          </label>
          {logoName && (
            <p className="text-muted-foreground mt-3 text-sm">
              Selected locally:{" "}
              <strong className="text-strong">{logoName}</strong>
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
                  tone={agency?.logoTone ?? "blue"}
                />
                <div>
                  <p className="text-strong font-semibold">
                    {values.displayName || "Agency name"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Client reporting portal
                  </p>
                </div>
              </div>
              <div className="bg-primary mt-5 h-2 rounded-full" />
            </div>
          </div>
          <FormField
            description="A fuller white-label module is outside this phase."
            id="brandColor"
            label="Accent color"
          >
            <Input
              id="brandColor"
              onChange={(event) => update("brandColor", event.target.value)}
              value={values.brandColor}
            />
          </FormField>
        </CardContent>
      </Card>
    </div>
  );

  const relationshipPreview = (title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
        <Badge className="mt-4" tone="neutral">
          Assignment preview
        </Badge>
      </CardContent>
    </Card>
  );

  const tabs: readonly TabOption[] = [
    { content: overview, label: "Overview", value: "overview" },
    { content: contact, label: "Primary contact", value: "contact" },
    { content: defaults, label: "Defaults", value: "defaults" },
    {
      content: relationshipPreview(
        "Workspaces",
        mode === "create"
          ? "Workspaces can be added after the agency profile exists."
          : `${agency?.workspaces ?? 0} linked workspaces remain unchanged in this UI preview.`,
      ),
      label: "Workspaces",
      value: "workspaces",
    },
    {
      content: relationshipPreview(
        "Administrators",
        "Administrator assignment becomes functional after API contracts and permissions are agreed.",
      ),
      label: "Administrators",
      value: "administrators",
    },
    { content: brand, label: "Brand preview", value: "brand" },
    {
      content: relationshipPreview(
        "Recent activity",
        mode === "create"
          ? "Activity will appear after the agency is created."
          : "Existing sample activity is available from the read-only agency details page.",
      ),
      label: "Recent activity",
      value: "activity",
    },
  ];

  const backHref = agency
    ? routes.agencies.detail(agency.id)
    : routes.agencies.index;
  return (
    <PageStack>
      <PageHeader
        actions={
          <>
            <div className="w-44">
              <Select
                aria-label="Form preview state"
                onChange={(event) =>
                  setSaveState(event.target.value as SaveState)
                }
                value={saveState}
              >
                <option value="ready">Ready</option>
                <option value="pending">Save pending</option>
                <option value="error">Save error</option>
                <option value="success">Save success</option>
              </Select>
            </div>
            <Badge tone={isDirty ? "warning" : "neutral"}>
              {isDirty ? "Unsaved preview changes" : "UI preview"}
            </Badge>
          </>
        }
        breadcrumbs={
          <>
            <Link className="hover:text-primary" href={routes.agencies.index}>
              Agencies
            </Link>
            <span aria-hidden> / </span>
            <span>{mode === "create" ? "New agency" : agency?.name}</span>
          </>
        }
        description={
          mode === "create"
            ? "Define the agency profile, primary contact, defaults, and starter brand."
            : "Update the agency profile and review how editable states will behave."
        }
        title={
          mode === "create"
            ? "Create agency"
            : `Edit ${agency?.name ?? "agency"}`
        }
      />
      <form noValidate onSubmit={submit}>
        {saveState === "error" && (
          <div
            className="bg-destructive-soft text-destructive mb-4 flex gap-3 rounded-lg border border-red-200 p-4"
            id="agency-form-errors"
            role="alert"
            tabIndex={-1}
          >
            <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">
                {Object.keys(errors).length
                  ? "Review the highlighted fields"
                  : "Agency could not be saved"}
              </p>
              <p className="text-sm">
                {Object.keys(errors).length
                  ? "Required agency and contact details are missing or invalid."
                  : "This simulated service error shows how a recoverable failure will appear. Your entered values are preserved."}
              </p>
            </div>
          </div>
        )}
        {saveState === "success" && (
          <div
            className="bg-success-soft text-success mb-4 flex gap-3 rounded-lg border border-green-200 p-4"
            role="status"
          >
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Save state preview</p>
              <p className="text-sm">
                The form is valid. No agency was created or updated because
                persistence is not connected.
              </p>
            </div>
          </div>
        )}
        {saveState === "pending" && (
          <div
            className="bg-info-soft text-info mb-4 flex gap-3 rounded-lg border border-sky-200 p-4"
            role="status"
          >
            <LoaderCircle
              aria-hidden
              className="mt-0.5 size-5 shrink-0 animate-spin"
            />
            <div>
              <p className="font-semibold">Saving agency</p>
              <p className="text-sm">
                Pending state preview. No request is running.
              </p>
            </div>
          </div>
        )}
        <div className="bg-card overflow-hidden rounded-lg border p-4 sm:p-5">
          <div className="overflow-x-auto">
            <Tabs items={tabs} />
          </div>
        </div>
        <div className="bg-card sticky bottom-0 z-10 mt-5 flex flex-col-reverse gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Save is a local visual validation preview and does not persist
            changes.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => (isDirty ? setIsDiscarding(true) : undefined)}
              asChild={!isDirty}
              type="button"
              variant="outline"
            >
              {isDirty ? (
                <>
                  <ArrowLeft aria-hidden className="size-4" /> Cancel
                </>
              ) : (
                <Link href={backHref}>
                  <ArrowLeft aria-hidden className="size-4" /> Cancel
                </Link>
              )}
            </Button>
            <Button disabled={saveState === "pending"} type="submit">
              <Save aria-hidden className="size-4" />
              {mode === "create" ? "Preview create" : "Preview save"}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        confirmLabel="Discard changes"
        description="Your local form edits have not been saved."
        isOpen={isDiscarding}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={() => {
          setIsDiscarding(false);
          window.location.assign(backHref);
        }}
        title="Discard preview changes?"
      />
    </PageStack>
  );
}
