import { describe, expect, it } from "vitest";

import { toConnectionFields, toCredentialValues } from "./connection";

const definitions = [
  {
    key: "access_token",
    label: "Access token",
    type: "secret" as const,
    required: true,
    help: "From Business Settings",
  },
  {
    key: "account_id",
    label: "Ad account ID",
    type: "text" as const,
    required: true,
  },
];

describe("connection fields", () => {
  it("fills definitions the credentials response leaves out from the catalogue", () => {
    const fields = toConnectionFields(
      [{ key: "access_token", is_set: true, hint: "•••• 1234" }],
      definitions,
    );
    expect(fields).toEqual([
      {
        key: "access_token",
        label: "Access token",
        type: "secret",
        isRequired: true,
        options: [],
        help: "From Business Settings",
        isSet: true,
        hint: "•••• 1234",
      },
    ]);
  });
  it("falls back to the channel definitions, all unset, when none are stored", () => {
    const fields = toConnectionFields([], definitions);
    expect(fields.map((field) => [field.key, field.isSet])).toEqual([
      ["access_token", false],
      ["account_id", false],
    ]);
  });
  it("sends only entered values so a blank secret keeps its stored value", () => {
    const fields = toConnectionFields(
      [
        { key: "access_token", is_set: true, hint: "•••• 1234" },
        { key: "account_id", is_set: false },
      ],
      definitions,
    );
    expect(toCredentialValues(fields, ["", "act_42"])).toEqual({
      account_id: "act_42",
    });
    expect(toCredentialValues(fields, ["   ", ""])).toEqual({});
  });
});
