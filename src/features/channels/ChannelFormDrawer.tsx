"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  type FieldPath,
  useFieldArray,
  useForm,
  type UseFormReturn,
} from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { DrawerSection } from "@/components/shared/LayoutPatterns";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Drawer } from "@/components/ui/Drawer";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/errors";

import {
  baseMetricCodes,
  type Channel,
  channelCategories,
  channelCategoryLabels,
  channelFormSchema,
  type ChannelFormValues,
  type ChannelRequest,
  metricLabels,
  toChannelFormValues,
} from "./contracts";
import { useSaveChannel } from "./queries";

const fieldTypeLabels = {
  text: "Text",
  secret: "Secret",
  select: "Select",
} as const;

const emptyCredentialField: ChannelFormValues["credential_fields"][number] = {
  key: "",
  label: "",
  type: "text",
  required: true,
  options: "",
  help: "",
};

function CredentialFieldsEditor({
  form,
}: {
  form: UseFormReturn<ChannelFormValues, unknown, ChannelRequest>;
}) {
  const { control, register, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "credential_fields",
  });
  const errors = formState.errors.credential_fields;
  return (
    <fieldset className="space-y-3">
      <legend className="text-strong text-sm font-semibold">
        Credential fields
      </legend>
      <p className="text-muted-foreground text-xs">
        The fields a workspace fills in to connect this channel. Secret values
        are stored encrypted and never shown again.
      </p>
      {fields.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          No credential fields yet.
        </p>
      )}
      <ol className="space-y-3">
        {fields.map((field, index) => {
          const prefix = `credential-field-${index}`;
          const rowErrors = errors?.[index];
          const label = watch(`credential_fields.${index}.label`);
          return (
            <li className="space-y-3 rounded-lg border p-3" key={field.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-strong text-sm font-medium">
                  Field {index + 1}
                </p>
                <Button
                  aria-label={`Remove field ${label || index + 1}`}
                  onClick={() => remove(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  error={rowErrors?.key?.message}
                  id={`${prefix}-key`}
                  label="Key"
                  required
                >
                  <Input
                    aria-invalid={Boolean(rowErrors?.key)}
                    id={`${prefix}-key`}
                    placeholder="access_token"
                    {...register(`credential_fields.${index}.key`)}
                  />
                </FormField>
                <FormField
                  error={rowErrors?.label?.message}
                  id={`${prefix}-label`}
                  label="Label"
                  required
                >
                  <Input
                    aria-invalid={Boolean(rowErrors?.label)}
                    id={`${prefix}-label`}
                    placeholder="Access token"
                    {...register(`credential_fields.${index}.label`)}
                  />
                </FormField>
                <FormField id={`${prefix}-type`} label="Type">
                  <Select
                    id={`${prefix}-type`}
                    {...register(`credential_fields.${index}.type`)}
                  >
                    {Object.entries(fieldTypeLabels).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <div className="flex items-center gap-2 sm:pt-7">
                  <Checkbox
                    id={`${prefix}-required`}
                    {...register(`credential_fields.${index}.required`)}
                  />
                  <Label htmlFor={`${prefix}-required`}>Required</Label>
                </div>
              </div>
              {watch(`credential_fields.${index}.type`) === "select" && (
                <FormField
                  description="One option per line."
                  error={rowErrors?.options?.message}
                  id={`${prefix}-options`}
                  label="Options"
                  required
                >
                  <Textarea
                    aria-invalid={Boolean(rowErrors?.options)}
                    className="min-h-20"
                    id={`${prefix}-options`}
                    {...register(`credential_fields.${index}.options`)}
                  />
                </FormField>
              )}
              <FormField
                error={rowErrors?.help?.message}
                id={`${prefix}-help`}
                label="Help text"
              >
                <Input
                  id={`${prefix}-help`}
                  {...register(`credential_fields.${index}.help`)}
                />
              </FormField>
            </li>
          );
        })}
      </ol>
      <Button
        onClick={() => append(emptyCredentialField)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus aria-hidden className="size-4" /> Add credential field
      </Button>
    </fieldset>
  );
}

export function ChannelFormDrawer({
  channel,
  onClose,
}: {
  channel?: Channel;
  onClose: () => void;
}) {
  const mutation = useSaveChannel();
  const [submitError, setSubmitError] = useState("");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const form = useForm<ChannelFormValues, unknown, ChannelRequest>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: toChannelFormValues(channel),
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = form;
  const isCodeLocked = channel?.is_code_locked ?? false;

  function requestClose() {
    if (isDirty && !mutation.isPending) setIsDiscarding(true);
    else if (!mutation.isPending) onClose();
  }

  async function submit(values: ChannelRequest) {
    setSubmitError("");
    try {
      const saved = await mutation.mutateAsync({
        channelId: channel?.id,
        payload: values,
      });
      toast({
        title: channel ? "Channel updated" : "Channel created",
        description: `${saved.name} was saved to the channel catalogue.`,
        tone: "success",
      });
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [path, message] of Object.entries(error.fieldErrors))
          setError(path as FieldPath<ChannelFormValues>, {
            type: "server",
            message,
          });
        setSubmitError(error.message);
      } else
        setSubmitError("The channel could not be saved. Please try again.");
    }
  }

  return (
    <>
      <Drawer
        isOpen
        onClose={requestClose}
        size="wide"
        title={channel ? `Edit ${channel.name}` : "Add channel"}
      >
        <form
          className="flex min-h-full flex-col"
          noValidate
          onSubmit={handleSubmit(submit, () =>
            setSubmitError("Review the highlighted fields."),
          )}
        >
          {submitError && (
            <p
              className="text-destructive mb-2 rounded-lg border p-3 text-sm"
              role="alert"
            >
              {submitError}
            </p>
          )}
          <DrawerSection className="grid gap-4 pt-0 sm:grid-cols-2">
            <FormField
              error={errors.name?.message}
              id="channel-name"
              label="Name"
              required
            >
              <Input
                aria-invalid={Boolean(errors.name)}
                id="channel-name"
                placeholder="Meta Ads"
                {...register("name")}
              />
            </FormField>
            <FormField
              description={
                isCodeLocked
                  ? "Locked because a workspace uses this channel."
                  : "Used by the API and integrations."
              }
              error={errors.code?.message}
              id="channel-code"
              label="Code"
              required
            >
              <Input
                aria-invalid={Boolean(errors.code)}
                id="channel-code"
                placeholder="meta_ads"
                readOnly={isCodeLocked}
                {...register("code")}
              />
            </FormField>
            <FormField
              error={errors.category?.message}
              id="channel-category"
              label="Category"
            >
              <Select id="channel-category" {...register("category")}>
                {channelCategories.map((category) => (
                  <option key={category} value={category}>
                    {channelCategoryLabels[category]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              description="Leave empty to add at the end."
              error={errors.position?.message}
              id="channel-position"
              label="Position"
            >
              <Input
                aria-invalid={Boolean(errors.position)}
                id="channel-position"
                inputMode="numeric"
                {...register("position")}
              />
            </FormField>
            <div className="flex items-start gap-2">
              <Checkbox id="channel-active" {...register("is_active")} />
              <div>
                <Label htmlFor="channel-active">Active</Label>
                <p className="text-muted-foreground text-xs">
                  Inactive channels stay on existing workspaces but can&apos;t
                  be picked for new ones.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="channel-campaigns"
                {...register("supports_campaigns")}
              />
              <Label htmlFor="channel-campaigns">Supports campaigns</Label>
            </div>
          </DrawerSection>
          <DrawerSection>
            <fieldset>
              <legend className="text-strong text-sm font-semibold">
                Metrics
              </legend>
              <p className="text-muted-foreground mt-1 text-xs">
                The base metrics this channel reports.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {baseMetricCodes.map((code) => (
                  <div className="flex items-center gap-2" key={code}>
                    <Checkbox
                      id={`channel-metric-${code}`}
                      value={code}
                      {...register("metric_codes")}
                    />
                    <Label htmlFor={`channel-metric-${code}`}>
                      {metricLabels[code]}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.metric_codes?.message && (
                <p className="text-destructive mt-2 text-xs" role="alert">
                  {errors.metric_codes.message}
                </p>
              )}
            </fieldset>
          </DrawerSection>
          <DrawerSection>
            <CredentialFieldsEditor form={form} />
          </DrawerSection>
          <div className="bg-card sticky bottom-0 mt-auto flex justify-end gap-2 border-t pt-4">
            <Button onClick={requestClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={mutation.isPending} type="submit">
              <Save aria-hidden className="size-4" />
              {mutation.isPending
                ? "Saving..."
                : channel
                  ? "Save channel"
                  : "Create channel"}
            </Button>
          </div>
        </form>
      </Drawer>
      <ConfirmationDialog
        body={<p>Your unsaved channel changes will be discarded.</p>}
        confirmLabel="Discard changes"
        description="Your edits have not been saved."
        isOpen={isDiscarding}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={onClose}
        title="Discard changes?"
      />
    </>
  );
}
