import { describe, expect, it } from "vitest";

import {
  channelFormSchema,
  type ChannelFormValues,
  channelListSchema,
  toChannelFormValues,
} from "./contracts";

const formValues: ChannelFormValues = {
  code: "meta_ads",
  name: "Meta Ads",
  category: "ads",
  is_active: true,
  credential_fields: [
    {
      key: "access_token",
      label: "Access token",
      type: "secret",
      required: true,
      options: "ignored",
      help: "  ",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: false,
      options: "EU\nUS, APAC",
      help: "Where the account is billed",
    },
  ],
  metric_codes: ["spend", "clicks"],
  supports_campaigns: true,
  position: "",
};

describe("channel form", () => {
  it("converts editor values to the channel request body", () => {
    expect(channelFormSchema.parse(formValues)).toEqual({
      code: "meta_ads",
      name: "Meta Ads",
      category: "ads",
      is_active: true,
      credential_fields: [
        {
          key: "access_token",
          label: "Access token",
          type: "secret",
          required: true,
          options: [],
          help: null,
        },
        {
          key: "region",
          label: "Region",
          type: "select",
          required: false,
          options: ["EU", "US", "APAC"],
          help: "Where the account is billed",
        },
      ],
      metric_codes: ["spend", "clicks"],
      supports_campaigns: true,
      position: undefined,
    });
  });

  it("reports duplicate keys and empty select options on their fields", () => {
    const result = channelFormSchema.safeParse({
      ...formValues,
      credential_fields: [
        { ...formValues.credential_fields[0]!, key: "token" },
        {
          ...formValues.credential_fields[1]!,
          key: "token",
          options: " ",
        },
      ],
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining([
        "credential_fields.1.options",
        "credential_fields.1.key",
      ]),
    );
  });

  it("round-trips a stored channel into editor values", () => {
    const [channel] = channelListSchema.parse({
      data: [
        {
          id: 3,
          code: "ga4",
          name: "Google Analytics 4",
          category: "analytics",
          is_active: false,
          credential_fields: [
            {
              key: "property",
              label: "Property",
              type: "select",
              required: true,
              options: ["Main", "Staging"],
              help: null,
            },
          ],
          metric_codes: ["sessions", "legacy_metric"],
          supports_campaigns: false,
          position: 4,
          workspace_count: 2,
          is_code_locked: true,
        },
      ],
    }).data;
    expect(toChannelFormValues(channel)).toMatchObject({
      category: "analytics",
      is_active: false,
      metric_codes: ["sessions"],
      position: "4",
      credential_fields: [{ options: "Main\nStaging", help: "" }],
    });
  });
});
