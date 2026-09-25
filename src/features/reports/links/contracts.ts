import { z } from "zod";

export const shareLinkStatuses = ["active", "expired", "revoked"] as const;

// Mirrors the API's `ReportShareLinkRequest`: the readable part of the slug
// is lowercase words joined by single dashes. The API appends a random
// 6-character suffix so the URL can't be guessed.
export const readableSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const maxReadableSlugLength = 93;
export const maxLabelLength = 100;
export const minPasswordLength = 8;
export const maxPasswordLength = 100;

const idSchema = z.number().int().positive();

const shareLinkSchema = z.object({
  id: idSchema,
  report_id: idSchema,
  label: z.string().nullable(),
  slug: z.string(),
  url: z.string(),
  status: z.enum(shareLinkStatuses),
  has_password: z.boolean(),
  expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  view_count: z.number().int().nonnegative(),
  last_viewed_at: z.string().nullable(),
  created_by: z
    .object({ id: idSchema, name: z.string() })
    .nullable()
    .optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const shareLinkListSchema = z.object({ data: z.array(shareLinkSchema) });
export const shareLinkResponseSchema = z.object({ data: shareLinkSchema });

const labelSchema = z.string().max(maxLabelLength).nullable();
const passwordSchema = z.string().min(minPasswordLength).max(maxPasswordLength);
const expiresSchema = z.iso.datetime({ offset: true }).nullable();

// Request bodies, also used by the proxy routes to reject malformed input.
export const shareLinkCreateRequestSchema = z.strictObject({
  label: labelSchema.optional(),
  slug: z
    .string()
    .max(maxReadableSlugLength)
    .regex(readableSlugPattern)
    .nullable()
    .optional(),
  password: passwordSchema.nullable().optional(),
  expires_at: expiresSchema.optional(),
});

export const shareLinkUpdateRequestSchema = z
  .strictObject({
    label: labelSchema.optional(),
    expires_at: expiresSchema.optional(),
    password: passwordSchema.optional(),
    remove_password: z.boolean().optional(),
  })
  .refine((body) => !(body.password !== undefined && body.remove_password), {
    message: "Set a password or remove it, not both.",
  });

export type ShareLink = z.infer<typeof shareLinkSchema>;
export type ShareLinkStatus = (typeof shareLinkStatuses)[number];
export type ShareLinkCreateRequest = z.infer<
  typeof shareLinkCreateRequestSchema
>;
export type ShareLinkUpdateRequest = z.infer<
  typeof shareLinkUpdateRequestSchema
>;

// `datetime-local` inputs hold local wall-clock time without an offset.
const pad = (value: number) => String(value).padStart(2, "0");
export function toLocalDateTimeInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function localInputToIso(value: string) {
  return new Date(value).toISOString();
}
function isFuture(value: string, now: number) {
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time > now;
}

const futureExpiryMessage = "Choose a date and time in the future.";
const passwordLengthMessage = `Use ${minPasswordLength} to ${maxPasswordLength} characters.`;

export function validateReadableSlug(value: string) {
  if (value === "") return undefined;
  if (value.length > maxReadableSlugLength)
    return `Use at most ${maxReadableSlugLength} characters.`;
  if (!readableSlugPattern.test(value))
    return "Use lowercase letters and numbers, with single dashes between words.";
  return undefined;
}

export function linkCreateFormSchema(now = () => Date.now()) {
  return z.object({
    label: z.string().trim().max(maxLabelLength),
    slug: z
      .string()
      .trim()
      .superRefine((value, context) => {
        const message = validateReadableSlug(value);
        if (message) context.addIssue({ code: "custom", message });
      }),
    password: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          (value.length >= minPasswordLength &&
            value.length <= maxPasswordLength),
        passwordLengthMessage,
      ),
    expires_at: z
      .string()
      .refine(
        (value) => value === "" || isFuture(value, now()),
        futureExpiryMessage,
      ),
  });
}
export type LinkCreateForm = z.infer<ReturnType<typeof linkCreateFormSchema>>;

export function toCreateRequest(
  values: LinkCreateForm,
): ShareLinkCreateRequest {
  return {
    ...(values.label && { label: values.label }),
    ...(values.slug && { slug: values.slug }),
    ...(values.password && { password: values.password }),
    ...(values.expires_at && {
      expires_at: localInputToIso(values.expires_at),
    }),
  };
}

export const passwordActions = ["keep", "set", "remove"] as const;
export type PasswordAction = (typeof passwordActions)[number];

// An expired link still carries its past expiry, so the expiry is only
// checked (and sent) when it was changed.
export function linkEditFormSchema(
  initialExpiresAt: string,
  now = () => Date.now(),
) {
  return z
    .object({
      label: z.string().trim().max(maxLabelLength),
      expires_at: z.string(),
      password_action: z.enum(passwordActions),
      password: z.string(),
    })
    .superRefine((values, context) => {
      if (
        values.expires_at !== "" &&
        values.expires_at !== initialExpiresAt &&
        !isFuture(values.expires_at, now())
      )
        context.addIssue({
          code: "custom",
          message: futureExpiryMessage,
          path: ["expires_at"],
        });
      if (
        values.password_action === "set" &&
        (values.password.length < minPasswordLength ||
          values.password.length > maxPasswordLength)
      )
        context.addIssue({
          code: "custom",
          message: passwordLengthMessage,
          path: ["password"],
        });
    });
}
export type LinkEditForm = z.infer<ReturnType<typeof linkEditFormSchema>>;

export function toUpdateRequest(
  values: LinkEditForm,
  initialExpiresAt: string,
): ShareLinkUpdateRequest {
  return {
    label: values.label || null,
    ...(values.expires_at !== initialExpiresAt && {
      expires_at: values.expires_at ? localInputToIso(values.expires_at) : null,
    }),
    ...(values.password_action === "set" && { password: values.password }),
    ...(values.password_action === "remove" && { remove_password: true }),
  };
}

export function activeLinkCount(links: readonly ShareLink[]) {
  return links.filter((link) => link.status === "active").length;
}
