"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  type FieldPath,
  type FieldValues,
  useForm,
  type UseFormSetError,
  useWatch,
} from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { CopyButton } from "@/components/shared/CopyButton";
import { DrawerSection } from "@/components/shared/LayoutPatterns";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { ApiError } from "@/lib/api/errors";

import type { ReportScope } from "../api";
import {
  type LinkCreateForm,
  linkCreateFormSchema,
  type LinkEditForm,
  linkEditFormSchema,
  maxReadableSlugLength,
  minPasswordLength,
  type PasswordAction,
  type ShareLink,
  toCreateRequest,
  toLocalDateTimeInput,
  toUpdateRequest,
} from "./contracts";
import { useCreateShareLink, useUpdateShareLink } from "./queries";

// Maps API field errors onto the form and returns the summary to show.
function applyServerErrors<Form extends FieldValues>(
  error: unknown,
  fields: readonly FieldPath<Form>[],
  setError: UseFormSetError<Form>,
  fallback: string,
) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 409)
    return "This link was revoked, so it can't be changed.";
  let isMapped = false;
  for (const field of fields) {
    const message = error.fieldErrors[field];
    if (message) {
      setError(field, { type: "server", message });
      isMapped = true;
    }
  }
  return isMapped ? "Review the highlighted fields." : error.message;
}

function FormError({ message }: { message: string }) {
  return message ? (
    <p
      className="text-destructive mb-2 rounded-lg border p-3 text-sm"
      role="alert"
    >
      {message}
    </p>
  ) : null;
}

function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card sticky bottom-0 mt-auto flex justify-end gap-2 border-t pt-4">
      {children}
    </div>
  );
}

function useDiscardGuard(
  isDirty: boolean,
  isPending: boolean,
  onClose: () => void,
) {
  const [isDiscarding, setIsDiscarding] = useState(false);
  return {
    requestClose() {
      if (isPending) return;
      if (isDirty) setIsDiscarding(true);
      else onClose();
    },
    dialog: (
      <ConfirmationDialog
        body={<p>The link details you entered will be discarded.</p>}
        confirmLabel="Discard changes"
        description="Your edits have not been saved."
        isOpen={isDiscarding}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={onClose}
        title="Discard changes?"
      />
    ),
  };
}

// Shows a new link's full URL once, after it is created or regenerated.
export function CreatedLinkDrawer({
  link,
  onClose,
  title,
}: {
  link: ShareLink;
  onClose: () => void;
  title: string;
}) {
  return (
    <Drawer isOpen onClose={onClose} size="wide" title={title}>
      <div className="flex min-h-full flex-col">
        <DrawerSection className="space-y-3 pt-0">
          <p className="text-strong text-sm font-medium">
            The link is ready to share.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="bg-muted min-w-0 flex-1 rounded-sm border px-3 py-2 font-mono text-sm break-all"
              data-testid="created-link-url"
            >
              {link.url}
            </code>
            <CopyButton label="Copy link URL" value={link.url} />
          </div>
          {link.has_password && (
            <p className="text-muted-foreground text-sm">
              The password is not shown again. Share it with the client
              separately.
            </p>
          )}
        </DrawerSection>
        <DrawerFooter>
          <Button onClick={onClose} type="button">
            Done
          </Button>
        </DrawerFooter>
      </div>
    </Drawer>
  );
}

const createFields = ["label", "slug", "password", "expires_at"] as const;

function CreateLinkForm({
  onClose,
  onCreated,
  scope,
}: {
  onClose: () => void;
  onCreated: (link: ShareLink) => void;
  scope: ReportScope;
}) {
  const mutation = useCreateShareLink(scope);
  const [formError, setFormError] = useState("");
  const form = useForm<LinkCreateForm>({
    resolver: zodResolver(linkCreateFormSchema()),
    defaultValues: { label: "", slug: "", password: "", expires_at: "" },
  });
  const {
    formState: { errors, isDirty },
    register,
  } = form;
  const guard = useDiscardGuard(isDirty, mutation.isPending, onClose);

  async function submit(values: LinkCreateForm) {
    setFormError("");
    try {
      const link = await mutation.mutateAsync(toCreateRequest(values));
      toast({ title: "Link created", tone: "success" });
      onCreated(link);
    } catch (error) {
      setFormError(
        applyServerErrors(
          error,
          createFields,
          form.setError,
          "The link could not be created. Please try again.",
        ),
      );
    }
  }

  return (
    <>
      <Drawer
        isOpen
        onClose={guard.requestClose}
        size="wide"
        title="Create link"
      >
        <form
          aria-label="Create link"
          className="flex min-h-full flex-col"
          noValidate
          onSubmit={form.handleSubmit(submit)}
        >
          <FormError message={formError} />
          <DrawerSection className="grid gap-4 pt-0">
            <FormField
              description="Only shown here, to tell links apart. For example: Leadership."
              error={errors.label?.message}
              id="link-label"
              label="Label"
            >
              <Input
                aria-invalid={Boolean(errors.label)}
                id="link-label"
                {...register("label")}
              />
            </FormField>
            <FormField
              description={`Lowercase words joined by dashes, up to ${maxReadableSlugLength} characters. Leave empty to use the report name. A random suffix is always added and the slug can't be changed later.`}
              error={errors.slug?.message}
              id="link-slug"
              label="Readable URL part"
            >
              <Input
                aria-invalid={Boolean(errors.slug)}
                autoCapitalize="none"
                className="font-mono"
                id="link-slug"
                placeholder="acme-monthly"
                spellCheck={false}
                {...register("slug")}
              />
            </FormField>
            <FormField
              description={`Optional. At least ${minPasswordLength} characters. Visitors must enter it to open the report.`}
              error={errors.password?.message}
              id="link-password"
              label="Password"
            >
              <PasswordInput
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                id="link-password"
                {...register("password")}
              />
            </FormField>
            <FormField
              description="Optional. Leave empty for a link that doesn't expire."
              error={errors.expires_at?.message}
              id="link-expires"
              label="Expires at"
            >
              <Input
                aria-invalid={Boolean(errors.expires_at)}
                id="link-expires"
                type="datetime-local"
                {...register("expires_at")}
              />
            </FormField>
          </DrawerSection>
          <DrawerFooter>
            <Button
              onClick={guard.requestClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={mutation.isPending} type="submit">
              <Save aria-hidden className="size-4" />
              {mutation.isPending ? "Creating..." : "Create link"}
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>
      {guard.dialog}
    </>
  );
}

const editFields = ["label", "expires_at", "password"] as const;

function EditLinkForm({
  link,
  onClose,
  scope,
}: {
  link: ShareLink;
  onClose: () => void;
  scope: ReportScope;
}) {
  const mutation = useUpdateShareLink(scope);
  const [formError, setFormError] = useState("");
  const initialExpiresAt = toLocalDateTimeInput(link.expires_at);
  const form = useForm<LinkEditForm>({
    resolver: zodResolver(linkEditFormSchema(initialExpiresAt)),
    defaultValues: {
      label: link.label ?? "",
      expires_at: initialExpiresAt,
      password_action: "keep",
      password: "",
    },
  });
  const {
    formState: { errors, isDirty },
    register,
  } = form;
  const guard = useDiscardGuard(isDirty, mutation.isPending, onClose);
  const passwordAction = useWatch({
    control: form.control,
    name: "password_action",
  });
  const passwordOptions: { value: PasswordAction; label: string }[] =
    link.has_password
      ? [
          { value: "keep", label: "Keep the current password" },
          { value: "set", label: "Replace the password" },
          { value: "remove", label: "Remove the password" },
        ]
      : [
          { value: "keep", label: "No password" },
          { value: "set", label: "Set a password" },
        ];

  async function submit(values: LinkEditForm) {
    setFormError("");
    try {
      await mutation.mutateAsync({
        linkId: link.id,
        payload: toUpdateRequest(values, initialExpiresAt),
      });
      toast({ title: "Link updated", tone: "success" });
      onClose();
    } catch (error) {
      setFormError(
        applyServerErrors(
          error,
          editFields,
          form.setError,
          "The link could not be saved. Please try again.",
        ),
      );
    }
  }

  return (
    <>
      <Drawer isOpen onClose={guard.requestClose} size="wide" title="Edit link">
        <form
          aria-label="Edit link"
          className="flex min-h-full flex-col"
          noValidate
          onSubmit={form.handleSubmit(submit)}
        >
          <FormError message={formError} />
          <DrawerSection className="grid gap-4 pt-0">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">URL</p>
              <p className="font-mono text-sm break-all">{link.url}</p>
            </div>
            <FormField
              error={errors.label?.message}
              id="link-edit-label"
              label="Label"
            >
              <Input
                aria-invalid={Boolean(errors.label)}
                id="link-edit-label"
                {...register("label")}
              />
            </FormField>
            <FormField
              description="Clear it for a link that doesn't expire."
              error={errors.expires_at?.message}
              id="link-edit-expires"
              label="Expires at"
            >
              <Input
                aria-invalid={Boolean(errors.expires_at)}
                id="link-edit-expires"
                type="datetime-local"
                {...register("expires_at")}
              />
            </FormField>
            <fieldset className="space-y-2">
              <legend className="text-strong text-sm font-medium">
                Password
              </legend>
              {passwordOptions.map((option) => (
                <label
                  className="flex items-center gap-2 text-sm"
                  key={option.value}
                >
                  <input
                    className="accent-primary size-4"
                    type="radio"
                    value={option.value}
                    {...register("password_action")}
                  />
                  {option.label}
                </label>
              ))}
              {passwordAction === "remove" && (
                <p className="text-muted-foreground text-xs">
                  Anyone with the URL can open the report. Visitors who unlocked
                  it with the old password must reload it.
                </p>
              )}
            </fieldset>
            {passwordAction === "set" && (
              <FormField
                description={`At least ${minPasswordLength} characters. Visitors who unlocked the link with an old password must enter the new one.`}
                error={errors.password?.message}
                id="link-edit-password"
                label="New password"
                required
              >
                <PasswordInput
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="new-password"
                  id="link-edit-password"
                  {...register("password")}
                />
              </FormField>
            )}
          </DrawerSection>
          <DrawerFooter>
            <Button
              onClick={guard.requestClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={mutation.isPending || !isDirty} type="submit">
              <Save aria-hidden className="size-4" />
              {mutation.isPending ? "Saving..." : "Save link"}
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>
      {guard.dialog}
    </>
  );
}

export function ShareLinkDrawer({
  link,
  onClose,
  scope,
}: {
  // Omitted to create a new link.
  link?: ShareLink;
  onClose: () => void;
  scope: ReportScope;
}) {
  const [created, setCreated] = useState<ShareLink>();
  if (link) return <EditLinkForm link={link} onClose={onClose} scope={scope} />;
  if (created)
    return (
      <CreatedLinkDrawer
        link={created}
        onClose={onClose}
        title="Link created"
      />
    );
  return (
    <CreateLinkForm onClose={onClose} onCreated={setCreated} scope={scope} />
  );
}
