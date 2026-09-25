import { z } from "zod";

const nullableText = z.string().nullable();
const statusSchema = z.enum(["active", "inactive"]);
const countSchema = z.coerce.number().int().nonnegative();

export const agencyListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().int().positive(),
      display_name: z.string(),
      logo_url: nullableText,
      primary_admin: z
        .object({ id: z.number(), name: z.string(), email: z.string() })
        .nullable(),
      workspace_count: countSchema,
      user_count: countSchema,
      default_currency: z.string(),
      status: statusSchema,
      created_at: nullableText,
      last_activity_at: nullableText,
    }),
  ),
  meta: z.object({
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    summary: z.object({
      total_agencies: z.number().int().nonnegative(),
      active_agencies: z.number().int().nonnegative(),
      total_workspaces: z.number().int().nonnegative(),
      total_agency_users: z.number().int().nonnegative(),
    }),
  }),
});

export const agencyResponseSchema = z.object({
  data: z.object({
    id: z.number().int().positive(),
    display_name: z.string(),
    legal_name: nullableText,
    description: nullableText,
    website: nullableText,
    status: statusSchema,
    logo_url: nullableText,
    brand_color: nullableText,
    created_at: nullableText,
    primary_contact: z.object({
      name: nullableText,
      email: nullableText,
      phone: nullableText,
      job_title: nullableText,
    }),
    defaults: z.object({
      currency: z.string(),
      time_zone: z.string(),
      language: z.string(),
      reporting_week_start: z.enum(["monday", "sunday"]),
      date_format: z.string(),
    }),
    // A Manager gets the profile only (name, logo, defaults); counts,
    // workspaces, administrators and activity come for Super Admin and the
    // Agency Admin, who are the only roles shown the agency screens.
    workspace_count: countSchema.default(0),
    user_count: countSchema.default(0),
    workspaces: z
      .array(
        z.object({
          id: z.number().int().positive(),
          name: z.string(),
          status: statusSchema,
          data_source_label: nullableText,
        }),
      )
      .default([]),
    administrators: z
      .array(
        z.object({
          id: z.number().int().positive(),
          name: z.string(),
          role_code: z.string(),
          status: z.string(),
        }),
      )
      .default([]),
    recent_activity: z
      .array(
        z.object({
          id: z.number().int().positive(),
          title: z.string(),
          description: z.string(),
          occurred_at: nullableText,
        }),
      )
      .default([]),
  }),
});

export const agencyProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Enter an agency display name.")
    .max(255),
  legal_name: z.string().max(255).nullable(),
  description: z.string().max(5000).nullable(),
  website: z.union([z.url("Enter a valid website URL.").max(255), z.null()]),
  status: statusSchema,
  brand_color: z.union([
    z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color."),
    z.null(),
  ]),
  primary_contact: z.object({
    name: z.string().max(255).nullable(),
    email: z.union([
      z.email("Enter a valid email address.").max(255),
      z.null(),
    ]),
    phone: z.string().max(50).nullable(),
    job_title: z.string().max(255).nullable(),
  }),
  defaults: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/, "Choose a three-letter currency."),
    time_zone: z.string().min(1),
    language: z.string().max(16),
    reporting_week_start: z.enum(["monday", "sunday"]),
    date_format: z.string().max(32),
  }),
});

export const agencyCreateSchema = agencyProfileSchema.partial().required({
  display_name: true,
});

export type AgencyListResponse = z.infer<typeof agencyListResponseSchema>;
export type AgencyRecord = z.infer<typeof agencyResponseSchema>["data"];
export type AgencyProfile = z.infer<typeof agencyProfileSchema>;
export type AgencyCreatePayload = z.infer<typeof agencyCreateSchema>;
