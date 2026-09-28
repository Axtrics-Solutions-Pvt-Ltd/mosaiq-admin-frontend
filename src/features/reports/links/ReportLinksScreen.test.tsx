import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { dashboardKeys } from "@/features/dashboard/queries";
import { reportPaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { ReportLinksScreen } from "./ReportLinksScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/reports/9/links",
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

const report = {
  id: 9,
  agency_id: 2,
  client_id: 4,
  client: { id: 4, name: "Acme" },
  name: "Acme monthly",
  status: "active",
  currency: "GBP",
  timezone: "Europe/London",
  default_range_preset: "last_30_days",
  layout_version: 1,
  active_links_count: 1,
  workspaces: [],
  created_by: null,
  updated_by: null,
  created_at: null,
  updated_at: null,
};

type LinkFixture = Record<string, unknown>;

function link(overrides: LinkFixture): LinkFixture {
  return {
    id: 1,
    report_id: 9,
    label: "Leadership",
    slug: "f33f97be57604b6b9f11cd9103be58c1",
    url: "https://portal.example.test/f33f97be57604b6b9f11cd9103be58c1",
    status: "active",
    has_password: true,
    expires_at: null,
    revoked_at: null,
    view_count: 12,
    last_viewed_at: "2026-09-24T08:00:00Z",
    created_by: { id: 1, name: "Dana Lee" },
    created_at: "2026-09-20T09:00:00Z",
    updated_at: "2026-09-20T09:00:00Z",
    ...overrides,
  };
}

// A small in-memory API so each action changes what the next list returns.
function useLinksApi(initial: LinkFixture[]) {
  let links = [...initial];
  const calls = {
    list: 0,
    report: 0,
    createBodies: [] as Record<string, unknown>[],
  };
  server.use(
    http.get(reportPaths.detail(2, 4, 9), () => {
      calls.report += 1;
      return HttpResponse.json({ data: report });
    }),
    http.get(reportPaths.links(2, 4, 9), () => {
      calls.list += 1;
      return HttpResponse.json({ data: links });
    }),
    http.post(reportPaths.links(2, 4, 9), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.createBodies.push(body);
      const created = link({
        id: 50,
        label: body.label ?? null,
        slug: "0a1b2c3d4e5f60718293a4b5c6d7e8f9",
        url: "https://portal.example.test/0a1b2c3d4e5f60718293a4b5c6d7e8f9",
        has_password: typeof body.password === "string",
        view_count: 0,
        last_viewed_at: null,
      });
      links = [created, ...links];
      return HttpResponse.json({ data: created }, { status: 201 });
    }),
    http.post(reportPaths.linkRevoke(2, 4, 9, 1), () => {
      links = links.map((entry) =>
        entry.id === 1
          ? { ...entry, status: "revoked", revoked_at: "2026-09-25T10:00:00Z" }
          : entry,
      );
      return HttpResponse.json({ data: links.find((entry) => entry.id === 1) });
    }),
    http.post(reportPaths.linkRegenerate(2, 4, 9, 1), () => {
      const replacement = link({
        id: 2,
        slug: "9f8e7d6c5b4a39281706f5e4d3c2b1a0",
        url: "https://portal.example.test/9f8e7d6c5b4a39281706f5e4d3c2b1a0",
        view_count: 0,
        last_viewed_at: null,
      });
      links = [
        replacement,
        ...links.map((entry) =>
          entry.id === 1 ? { ...entry, status: "revoked" } : entry,
        ),
      ];
      return HttpResponse.json({ data: replacement }, { status: 201 });
    }),
  );
  return calls;
}

function renderScreen() {
  return renderWithScope(
    <ReportLinksScreen agencyId={2} clientId={4} reportId={9} />,
    { platformRoleCode: "SUPER_ADMIN" },
  );
}

const table = () => screen.getByRole("table", { name: "Share links" });

describe("ReportLinksScreen", () => {
  it("revokes a link after confirmation and refreshes the list", async () => {
    const user = userEvent.setup();
    const calls = useLinksApi([link({})]);
    const { queryClient } = renderScreen();
    queryClient.setQueryData(dashboardKeys.summary, { active_links: 1 });
    await user.click(
      await within(await screen.findByRole("table")).findByRole("button", {
        name: "Revoke Leadership",
      }),
    );
    const dialog = screen.getByRole("dialog", { name: "Revoke this link?" });
    expect(
      within(dialog).getByText(
        "Anyone with this link loses access immediately.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Revoke link" }),
    );

    await waitFor(() =>
      expect(within(table()).getByLabelText("Status: Revoked")).toBeVisible(),
    );
    expect(calls.list).toBe(2);
    // The server-computed counts on the report and the dashboard are stale.
    await waitFor(() => expect(calls.report).toBe(2));
    expect(
      queryClient.getQueryState(dashboardKeys.summary)?.isInvalidated,
    ).toBe(true);
    // Revoked links stay listed with their actions disabled.
    for (const name of ["Edit", "Regenerate", "Revoke"])
      expect(
        within(table()).getByRole("button", { name: `${name} Leadership` }),
      ).toBeDisabled();
    expect(
      within(table()).queryByRole("link", { name: /Open Leadership/ }),
    ).toBeNull();
  });

  it("regenerates a link, shows the new URL and refreshes the list", async () => {
    const user = userEvent.setup();
    const calls = useLinksApi([link({})]);
    renderScreen();
    await user.click(
      await within(await screen.findByRole("table")).findByRole("button", {
        name: "Regenerate Leadership",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Regenerate this link?",
    });
    expect(
      within(dialog).getByText(
        "The old URL stops working and a new URL is created with the same settings.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Regenerate link" }),
    );

    const result = await screen.findByRole("dialog", {
      name: "Link regenerated",
    });
    expect(within(result).getByTestId("created-link-url")).toHaveTextContent(
      "https://portal.example.test/9f8e7d6c5b4a39281706f5e4d3c2b1a0",
    );
    await waitFor(() => expect(calls.list).toBe(2));
    expect(
      within(table()).getAllByLabelText(/Status: (Active|Revoked)/),
    ).toHaveLength(2);
  });

  it("creates a password-protected link and shows its URL once", async () => {
    const user = userEvent.setup();
    const calls = useLinksApi([]);
    renderScreen();
    await user.click(
      await screen.findByRole("button", { name: "Create link" }),
    );
    const form = screen.getByRole("form", { name: "Create link" });
    // The URL is a random token from the API, so it can't be typed in.
    expect(within(form).queryByLabelText("Readable URL part")).toBeNull();

    await user.type(within(form).getByLabelText("Label"), "Board");
    await user.type(within(form).getByLabelText("Password"), "open-sesame");
    await user.click(within(form).getByRole("button", { name: "Create link" }));

    const result = await screen.findByRole("dialog", { name: "Link created" });
    expect(within(result).getByTestId("created-link-url")).toHaveTextContent(
      "https://portal.example.test/0a1b2c3d4e5f60718293a4b5c6d7e8f9",
    );
    expect(calls.createBodies).toEqual([
      { label: "Board", password: "open-sesame" },
    ]);
    expect(
      within(result).getByText(/The password is not shown again\./),
    ).toBeInTheDocument();
    expect(
      within(result).getByRole("button", { name: "Copy link URL" }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when the report has no links", async () => {
    useLinksApi([]);
    renderScreen();
    expect(await screen.findByText("No links yet")).toBeInTheDocument();
  });
});
