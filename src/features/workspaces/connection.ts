import type { CredentialField } from "@/features/channels/contracts";

import type { StoredCredentialField } from "./contracts";

export type ConnectionField = {
  key: string;
  label: string;
  type: CredentialField["type"];
  isRequired: boolean;
  options: readonly string[];
  help: string | null;
  isSet: boolean;
  hint: string | null;
};

// The credentials response says which fields are set; the channel catalogue
// fills in any definition detail the response leaves out.
export function toConnectionFields(
  stored: readonly StoredCredentialField[],
  definitions: readonly CredentialField[],
): ConnectionField[] {
  const source: readonly (Partial<StoredCredentialField> & { key: string })[] =
    stored.length > 0 ? stored : definitions;
  return source.map((field) => {
    const definition = definitions.find((entry) => entry.key === field.key);
    return {
      key: field.key,
      label: field.label ?? definition?.label ?? field.key,
      type: field.type ?? definition?.type ?? "text",
      isRequired: field.required ?? definition?.required ?? false,
      options: field.options ?? definition?.options ?? [],
      help: field.help ?? definition?.help ?? null,
      isSet: field.is_set ?? false,
      hint: field.hint ?? null,
    };
  });
}

// A blank input keeps the stored value, so only entered values are sent.
export function toCredentialValues(
  fields: readonly ConnectionField[],
  entered: readonly string[],
): Record<string, string> {
  const values: Record<string, string> = {};
  fields.forEach((field, index) => {
    const value = entered[index] ?? "";
    if (value.trim() !== "") values[field.key] = value;
  });
  return values;
}
