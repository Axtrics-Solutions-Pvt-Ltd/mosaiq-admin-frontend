import { z } from "zod";

const environmentSchema = z.object({
  APP_ROOT_PREVIEW: z.enum(["login", "dashboard"]).default("login"),
});

export const env = environmentSchema.parse({
  APP_ROOT_PREVIEW: process.env.APP_ROOT_PREVIEW,
});

const originSchema = z
  .string()
  .url()
  .transform((value, context) => {
    const url = new URL(value);
    if (url.origin !== value || !["http:", "https:"].includes(url.protocol)) {
      context.addIssue({
        code: "custom",
        message: "Expected an exact HTTP(S) origin",
      });
      return z.NEVER;
    }
    return value;
  });

export function getServerApiConfig() {
  const parsed = z
    .object({
      apiOrigin: originSchema,
      adminOrigin: originSchema,
      sessionCookieName: z.string().min(1).default("mosaiq-session"),
    })
    .parse({
      apiOrigin: process.env.VITE_API_BASE_URL,
      adminOrigin: process.env.NEXT_ADMIN_ORIGIN,
      sessionCookieName: process.env.ADMIN_SESSION_COOKIE,
    });
  return parsed;
}
