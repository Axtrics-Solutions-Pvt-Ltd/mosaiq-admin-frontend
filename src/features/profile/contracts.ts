import { z } from "zod";

import { updateAgencyUserSchema } from "@/features/users/contracts";

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/\p{L}/u, "Include a letter.")
      .regex(/\p{N}/u, "Include a number."),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password !== values.current_password, {
    message: "Choose a password different from your current one.",
    path: ["password"],
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords must match.",
    path: ["password_confirmation"],
  });
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

// The existing user update contract remains the source of truth for name rules.
export const editProfileSchema = z.object({
  name: updateAgencyUserSchema.shape.name.unwrap(),
});
export type EditProfilePayload = z.infer<typeof editProfileSchema>;
