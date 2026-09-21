import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { authKeys } from "@/features/auth/queries";
import { csvImportPaths, workspacePaths } from "@/lib/api/paths";
import { server } from "@/mocks/server";

import { DataImportPreview } from "./DataImportPreview";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);

function renderWithProviders(capability: "AGENCY_ADMIN" | "VIEWER") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(authKeys.me(), {
    id: 1,
    name: "Agency Admin",
    email: "admin@example.test",
    platformRoleCode: null,
    membership: {
      agencyId: 12,
      roleCode: capability,
      clientId: null,
      workspaceIds: [],
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DataImportPreview />
    </QueryClientProvider>,
  );
}

function mockDestinationLookups() {
  server.use(
    http.get(workspacePaths.clients(12), () =>
      HttpResponse.json({
        data: [{ id: 4, name: "Acme", agency_id: 12, status: "active" }],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
    http.get(workspacePaths.collection(12, 4), () =>
      HttpResponse.json({
        data: [
          {
            id: 7,
            agency_id: 12,
            client_id: 4,
            name: "Growth Studio",
            timezone: "Europe/London",
            currency: "GBP",
            status: "active",
            created_at: null,
            updated_at: null,
          },
        ],
        meta: { current_page: 1, last_page: 1, total: 1 },
      }),
    ),
  );
}

async function chooseDestination(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Client" }));
  await user.click(await screen.findByRole("option", { name: /Acme/i }));
  await user.click(screen.getByRole("button", { name: "Workspace" }));
  await user.click(await screen.findByRole("option", { name: /Growth Studio/i }));
}

describe("DataImportPreview", () => {
  it("blocks users without the imports.create capability", () => {
    renderWithProviders("VIEWER");
    expect(
      screen.getByText("You do not have access to data import"),
    ).toBeInTheDocument();
  });

  it("uploads a CSV, reviews validation, and confirms an append import", async () => {
    const user = userEvent.setup();
    mockDestinationLookups();
    const csvImportRecord = {
      id: 55,
      agency_id: 12,
      workspace_id: 7,
      type: "reporting",
      template_version: 1,
      status: "previewed",
      mode: null,
      original_filename: "campaign-data.csv",
      checksum: "abc123",
      row_count: 10,
      valid_count: 9,
      error_count: 1,
      validation_errors: [{ row: 3, column: "spend", message: "Not a number." }],
      failure_code: null,
      file_expires_at: "2026-09-22T10:00:00Z",
      confirmed_at: null,
      completed_at: null,
    };
    let receivedType: unknown;
    server.use(
      http.post(csvImportPaths.preview(12, 4, 7), async ({ request }) => {
        const formData = await request.formData();
        receivedType = formData.get("type");
        return HttpResponse.json({ data: csvImportRecord }, { status: 201 });
      }),
      http.get(csvImportPaths.detail(12, 4, 7, 55), () =>
        HttpResponse.json({ data: csvImportRecord }),
      ),
    );

    renderWithProviders("AGENCY_ADMIN");
    await chooseDestination(user);

    const file = new File(["date,spend\n2026-09-01,100"], "campaign-data.csv", {
      type: "text/csv",
    });
    await user.upload(screen.getByLabelText("Choose local CSV file"), file);

    await user.click(screen.getByRole("button", { name: /upload and validate/i }));

    expect(await screen.findByText("Not a number.")).toBeInTheDocument();
    expect(receivedType).toBe("reporting");
    expect(screen.getByText("9")).toBeInTheDocument();

    server.use(
      http.post(csvImportPaths.confirm(12, 4, 7, 55), async ({ request }) => {
        const body = (await request.json()) as { mode: string };
        expect(body.mode).toBe("append");
        return HttpResponse.json({
          data: { ...csvImportRecord, status: "imported", mode: "append", completed_at: "2026-09-21T12:00:00Z" },
        });
      }),
    );

    await user.click(screen.getByRole("button", { name: /^confirm import$/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /^confirm import$/i }),
    );

    await waitFor(() =>
      expect(screen.getByText("Import confirmed")).toBeInTheDocument(),
    );
  });
});
