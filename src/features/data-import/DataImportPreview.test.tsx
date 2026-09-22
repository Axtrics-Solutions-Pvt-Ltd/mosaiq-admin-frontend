import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  agencyPaths,
  creativeAssetPaths,
  csvImportPaths,
  csvTemplatePaths,
  workspacePaths,
} from "@/lib/api/paths";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { DataImportPreview } from "./DataImportPreview";

vi.mock("next/navigation", () => ({
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
afterEach(cleanup);

function renderWithProviders(capability: "AGENCY_ADMIN" | "VIEWER") {
  renderWithScope(<DataImportPreview />, {
    membership: { agencyId: 12, roleCode: capability },
  });
}

function mockDestinationLookups() {
  server.use(
    http.get(agencyPaths.collection, () =>
      HttpResponse.json({
        data: [
          {
            id: 12,
            display_name: "Acme Agency",
            logo_url: null,
            primary_admin: null,
            workspace_count: 1,
            user_count: 1,
            default_currency: "USD",
            status: "active",
            created_at: null,
            last_activity_at: null,
          },
        ],
        meta: {
          current_page: 1,
          last_page: 1,
          total: 1,
          summary: {
            total_agencies: 1,
            active_agencies: 1,
            total_workspaces: 1,
            total_agency_users: 1,
          },
        },
      }),
    ),
    http.get(agencyPaths.detail(12), () =>
      HttpResponse.json({
        data: {
          id: 12,
          display_name: "Acme Agency",
          legal_name: null,
          description: null,
          website: null,
          status: "active",
          logo_url: null,
          brand_color: null,
          created_at: null,
          primary_contact: {
            name: null,
            email: null,
            phone: null,
            job_title: null,
          },
          defaults: {
            currency: "USD",
            time_zone: "UTC",
            language: "en",
            reporting_week_start: "monday",
            date_format: "YYYY-MM-DD",
          },
          workspace_count: 1,
          user_count: 1,
          workspaces: [],
          administrators: [],
          recent_activity: [],
        },
      }),
    ),
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
    http.get(csvTemplatePaths.allCollection, () =>
      HttpResponse.json({
        data: [
          {
            type: "reporting",
            version: 2,
            accepted_versions: [1, 2],
            columns: [
              "date",
              "channel",
              "campaign",
              "impressions",
              "clicks",
              "spend",
              "revenue",
              "status",
            ],
          },
          {
            type: "marketing",
            version: 2,
            accepted_versions: [1, 2],
            columns: [
              "date",
              "channel",
              "campaign",
              "spend",
              "leads",
              "conversions",
              "status",
            ],
          },
          {
            type: "mmm",
            version: 1,
            accepted_versions: [1],
            columns: ["date", "channel", "spend", "outcome"],
          },
          {
            type: "creative_assets",
            version: 1,
            accepted_versions: [1],
            columns: [
              "title",
              "campaign_name",
              "channel",
              "status",
              "impressions",
              "clicks",
              "conversions",
              "spend",
            ],
          },
        ],
      }),
    ),
  );
}

async function chooseDestination(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Client" }));
  await user.click(await screen.findByRole("option", { name: /Acme/i }));
  await user.click(screen.getByRole("button", { name: "Workspace" }));
  await user.click(
    await screen.findByRole("option", { name: /Growth Studio/i }),
  );
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
      validation_errors: [
        { row: 3, column: "spend", message: "Not a number." },
      ],
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

    await user.click(
      screen.getByRole("button", { name: /upload and validate/i }),
    );

    expect(await screen.findByText("Not a number.")).toBeInTheDocument();
    expect(receivedType).toBe("reporting");
    expect(screen.getByText("9")).toBeInTheDocument();

    server.use(
      http.post(csvImportPaths.confirm(12, 4, 7, 55), async ({ request }) => {
        const body = (await request.json()) as { mode: string };
        expect(body.mode).toBe("append");
        return HttpResponse.json({
          data: {
            ...csvImportRecord,
            status: "imported",
            mode: "append",
            completed_at: "2026-09-21T12:00:00Z",
          },
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

  it("attaches a file to an imported creative asset row after confirmation", async () => {
    const user = userEvent.setup();
    mockDestinationLookups();
    const csvImportRecord = {
      id: 90,
      agency_id: 12,
      workspace_id: 7,
      type: "creative_assets",
      template_version: 1,
      status: "previewed",
      mode: null,
      original_filename: "creative.csv",
      checksum: "def456",
      row_count: 1,
      valid_count: 1,
      error_count: 0,
      validation_errors: [],
      failure_code: null,
      file_expires_at: "2026-09-22T10:00:00Z",
      confirmed_at: null,
      completed_at: null,
    };
    const creativeRow = {
      id: 501,
      agency_id: 12,
      workspace_id: 7,
      title: "Spring banner",
      campaign_name: "Spring Launch",
      channel: "Paid Social",
      status: null,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: "0.00",
      asset_url: null,
    };
    server.use(
      http.post(csvImportPaths.preview(12, 4, 7), () =>
        HttpResponse.json({ data: csvImportRecord }, { status: 201 }),
      ),
      http.get(csvImportPaths.detail(12, 4, 7, 90), () =>
        HttpResponse.json({ data: csvImportRecord }),
      ),
      http.post(csvImportPaths.confirm(12, 4, 7, 90), () =>
        HttpResponse.json({
          data: { ...csvImportRecord, status: "imported", mode: "append" },
        }),
      ),
      http.get(creativeAssetPaths.allCollection, ({ request }) => {
        expect(new URL(request.url).searchParams.get("csv_import_id")).toBe(
          "90",
        );
        return HttpResponse.json({ data: [creativeRow] });
      }),
    );

    renderWithProviders("AGENCY_ADMIN");
    await chooseDestination(user);

    await user.selectOptions(
      screen.getByLabelText("Dataset type"),
      "Creative Assets",
    );

    const file = new File(["title\nSpring banner"], "creative.csv", {
      type: "text/csv",
    });
    await user.upload(screen.getByLabelText("Choose local CSV file"), file);
    await user.click(
      screen.getByRole("button", { name: /upload and validate/i }),
    );

    await user.click(screen.getByRole("button", { name: /^confirm import$/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /^confirm import$/i }),
    );

    expect(await screen.findByText("Spring banner")).toBeInTheDocument();

    let receivedFileName: unknown;
    server.use(
      http.post(
        creativeAssetPaths.attachAsset(12, 4, 7, 501),
        async ({ request }) => {
          const formData = await request.formData();
          receivedFileName = (formData.get("file") as File).name;
          return HttpResponse.json({
            data: {
              ...creativeRow,
              asset_url: "https://cdn.example.com/spring.jpg",
            },
          });
        },
      ),
    );

    const assetFile = new File(["binary"], "spring.jpg", {
      type: "image/jpeg",
    });
    await user.upload(
      screen.getByLabelText("Choose media file for Spring banner"),
      assetFile,
    );
    await user.click(screen.getByRole("button", { name: /^attach$/i }));

    expect(await screen.findByText("Attached")).toBeInTheDocument();
    expect(receivedFileName).toBe("spring.jpg");
  });
});
