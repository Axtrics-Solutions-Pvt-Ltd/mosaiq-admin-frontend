import { describe, expect, it } from "vitest";

import { roleListSchema } from "./contracts";

describe("role contract", () => {
  it("parses a fixed role catalogue", () => {
    const result = roleListSchema.safeParse({
      data: [
        {
          code: "AGENCY_ADMIN",
          name: "Agency Admin",
          assignable: true,
          permissions: ["agency_edit", "user_manage"],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown role code", () => {
    const result = roleListSchema.safeParse({
      data: [
        {
          code: "UNKNOWN_ROLE",
          name: "Unknown",
          assignable: true,
          permissions: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
