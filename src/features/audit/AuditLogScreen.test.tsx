import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { AuditLogScreen } from "./AuditLogScreen";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}));

const defaults = {
  page: 1,
  category: "all",
  result: "all",
  dateFrom: "",
  dateTo: "",
} as const;

let lastQuery = new URLSearchParams();
beforeEach(() => {
  replace.mockReset();
  server.use(
    http.get(workspacePaths.agencyCollection(2), () =>
      HttpResponse.json({
        data: [],
        meta: { current_page: 1, last_page: 1, total: 0 },
      }),
    ),
    http.get(auditPaths.collection, ({ request }) => {
      lastQuery = new URL(request.url).searchParams;
      return HttpResponse.json({
        data: [
          {
            id: 3,
            action: "workspace.fetched",
            result: "failure",
            actor: { id: 1, name: "Avery Admin" },
            agency: { id: 2, name: "Northstar" },
            workspace: { id: 7, name: "Acme – Meta Ads", client_id: 4 },
            subject_type: "Workspace",
            subject_id: 7,
            metadata: { rows_upserted: 0 },
            created_at: "2026-09-02T09:00:00.000000Z",
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      });
    }),
  );
});

describe("AuditLogScreen", () => {
  it("lists events with a readable action, actor and workspace", async () => {
    renderWithScope(<AuditLogScreen {...defaults} />, {
      membership: { agencyId: 2, roleCode: "AGENCY_ADMIN" },
    });
    expect(
      (await screen.findAllByText("Channel data fetched")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Avery Admin").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Acme – Meta Ads" })[0],
    ).toHaveAttribute("href", expect.stringContaining("/workspaces/7"));
    expect(lastQuery.get("agency_id")).toBe("2");
  });

  it("sends the chosen filters and resets the page when one changes", async () => {
    renderWithScope(
      <AuditLogScreen
        {...defaults}
        category="workspace"
        dateFrom="2026-09-01"
        page={2}
      />,
      { membership: { agencyId: 2, roleCode: "AGENCY_ADMIN" } },
    );
    await screen.findAllByText("Channel data fetched");
    expect(lastQuery.get("category")).toBe("workspace");
    expect(lastQuery.get("date_from")).toBe("2026-09-01");
    expect(lastQuery.get("page")).toBe("2");

    await userEvent.selectOptions(screen.getByLabelText("Result"), "failure");
    expect(replace).toHaveBeenCalledWith(
      expect.stringMatching(/result=failure/),
    );
    expect(replace).not.toHaveBeenCalledWith(expect.stringMatching(/page=/));
  });

  it("explains that a Manager cannot read the log", async () => {
    renderWithScope(<AuditLogScreen {...defaults} />, {
      membership: { agencyId: 2, roleCode: "MANAGER" },
    });
    expect(
      await screen.findByText("Audit log unavailable"),
    ).toBeInTheDocument();
  });
});
