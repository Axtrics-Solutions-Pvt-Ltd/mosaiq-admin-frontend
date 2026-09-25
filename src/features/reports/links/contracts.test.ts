import { describe, expect, it } from "vitest";

import {
  activeLinkCount,
  linkCreateFormSchema,
  linkEditFormSchema,
  shareLinkCreateRequestSchema,
  shareLinkListSchema,
  shareLinkUpdateRequestSchema,
  toCreateRequest,
  toLocalDateTimeInput,
  toUpdateRequest,
  validateReadableSlug,
} from "./contracts";

const now = new Date(2026, 8, 25, 12, 0).getTime();
const clock = () => now;

describe("readable slug validation", () => {
  it("accepts lowercase words joined by single dashes, or nothing", () => {
    for (const slug of ["", "acme", "acme-monthly-2026", "q3"])
      expect(validateReadableSlug(slug)).toBeUndefined();
  });

  it("rejects what the API pattern rejects", () => {
    for (const slug of [
      "Acme",
      "acme monthly",
      "acme--monthly",
      "-acme",
      "acme-",
      "acme_monthly",
      "acmé",
    ])
      expect(validateReadableSlug(slug)).toMatch(/lowercase letters/);
  });

  it("limits the readable part to 93 characters", () => {
    expect(validateReadableSlug("a".repeat(93))).toBeUndefined();
    expect(validateReadableSlug("a".repeat(94))).toMatch(/at most 93/);
  });

  it("is enforced by the create form and the proxy request schema", () => {
    const form = linkCreateFormSchema(clock).safeParse({
      label: "",
      slug: "Bad Slug",
      password: "",
      expires_at: "",
    });
    expect(form.success).toBe(false);
    expect(
      shareLinkCreateRequestSchema.safeParse({ slug: "bad--slug" }).success,
    ).toBe(false);
    expect(
      shareLinkCreateRequestSchema.safeParse({ slug: "good-slug" }).success,
    ).toBe(true);
  });
});

describe("create form", () => {
  const schema = linkCreateFormSchema(clock);
  const empty = { label: "", slug: "", password: "", expires_at: "" };

  it("sends only the fields that were filled in", () => {
    expect(toCreateRequest(schema.parse(empty))).toEqual({});
    const request = toCreateRequest(
      schema.parse({
        label: " Leadership ",
        slug: "acme",
        password: "open-sesame",
        expires_at: "2026-10-01T09:30",
      }),
    );
    expect(request).toEqual({
      label: "Leadership",
      slug: "acme",
      password: "open-sesame",
      expires_at: new Date(2026, 9, 1, 9, 30).toISOString(),
    });
    expect(shareLinkCreateRequestSchema.safeParse(request).success).toBe(true);
  });

  it("requires a future expiry and an 8-character password", () => {
    const result = schema.safeParse({
      ...empty,
      password: "short",
      expires_at: "2026-09-25T11:59",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "expires_at",
      "password",
    ]);
  });
});

describe("edit form", () => {
  it("keeps a past expiry that was not changed", () => {
    const initial = "2026-09-01T10:00";
    const values = linkEditFormSchema(initial, clock).parse({
      label: "",
      expires_at: initial,
      password_action: "keep",
      password: "",
    });
    expect(toUpdateRequest(values, initial)).toEqual({ label: null });
  });

  it("rejects a changed expiry in the past and clears a removed one", () => {
    const schema = linkEditFormSchema("2026-10-01T10:00", clock);
    expect(
      schema.safeParse({
        label: "",
        expires_at: "2026-09-20T10:00",
        password_action: "keep",
        password: "",
      }).success,
    ).toBe(false);
    const cleared = schema.parse({
      label: "Board",
      expires_at: "",
      password_action: "keep",
      password: "",
    });
    expect(toUpdateRequest(cleared, "2026-10-01T10:00")).toEqual({
      label: "Board",
      expires_at: null,
    });
  });

  it("sets, replaces or removes the password", () => {
    const schema = linkEditFormSchema("", clock);
    expect(
      schema.safeParse({
        label: "",
        expires_at: "",
        password_action: "set",
        password: "short",
      }).success,
    ).toBe(false);
    const set = schema.parse({
      label: "",
      expires_at: "",
      password_action: "set",
      password: "new-password",
    });
    expect(toUpdateRequest(set, "")).toEqual({
      label: null,
      password: "new-password",
    });
    const removed = schema.parse({
      label: "",
      expires_at: "",
      password_action: "remove",
      password: "ignored",
    });
    expect(toUpdateRequest(removed, "")).toEqual({
      label: null,
      remove_password: true,
    });
    expect(
      shareLinkUpdateRequestSchema.safeParse({
        password: "new-password",
        remove_password: true,
      }).success,
    ).toBe(false);
  });
});

describe("share link responses", () => {
  const link = {
    id: 1,
    report_id: 9,
    label: null,
    slug: "acme-x1y2z3",
    url: "https://portal.example.test/userPortal/acme-x1y2z3",
    status: "active",
    has_password: false,
    expires_at: null,
    revoked_at: null,
    view_count: 0,
    last_viewed_at: null,
    created_by: { id: 1, name: "Dana Lee" },
    created_at: "2026-09-20T09:00:00Z",
    updated_at: "2026-09-20T09:00:00Z",
  };

  it("counts only active links", () => {
    const links = shareLinkListSchema.parse({
      data: [
        link,
        { ...link, id: 2, status: "expired" },
        { ...link, id: 3, status: "revoked" },
      ],
    }).data;
    expect(activeLinkCount(links)).toBe(1);
  });

  it("formats an ISO time for a datetime-local input", () => {
    expect(toLocalDateTimeInput(null)).toBe("");
    expect(toLocalDateTimeInput(new Date(2026, 9, 1, 9, 5).toISOString())).toBe(
      "2026-10-01T09:05",
    );
  });
});
