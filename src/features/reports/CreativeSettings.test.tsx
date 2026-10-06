import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { reportPaths } from "@/lib/api/paths";
import {
  creativeListFixture,
  layoutItem,
  listedCreative,
  type ListedCreativeFixture,
} from "@/mocks/fixtures/reports";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { layoutItemResponseSchema } from "./contracts";
import { WidgetInspector } from "./WidgetInspector";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
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

const scope = { agencyId: 1, clientId: 20, reportId: 7 };
const itemId = 31;

const sky = listedCreative({
  key: "cr_1",
  original_title: "Brand Awareness – Image 1",
});
const field = listedCreative({
  key: "cr_2",
  original_title: "Retargeting – 30 day – Image 2",
  campaign: "Retargeting – 30 day",
});

function creativeWidget(settings: Record<string, unknown> = {}) {
  const fixture = layoutItem({
    id: itemId,
    parent_id: 3,
    level: "widget",
    code: "creative_performance",
    title: "Creative Performance",
    type: "creative_grid",
    kind: "live",
    position: 0,
    settings,
  });
  return {
    fixture,
    item: layoutItemResponseSchema.parse({ data: fixture }).data,
  };
}

function useCreativesApi(
  creatives: ListedCreativeFixture[] = [sky, field],
  meta?: { last_page?: number },
) {
  const requests: URL[] = [];
  server.use(
    http.get(
      reportPaths.layoutItemCreatives(1, 20, 7, itemId),
      ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        return HttpResponse.json(
          creativeListFixture(creatives, {
            current_page: Number(url.searchParams.get("page") ?? 1),
            ...meta,
          }),
        );
      },
    ),
  );
  return requests;
}

function usePatchApi(
  fixture: ReturnType<typeof creativeWidget>["fixture"],
  response?: () => Response,
) {
  const sent: unknown[] = [];
  server.use(
    http.patch(
      reportPaths.layoutItem(1, 20, 7, itemId),
      async ({ request }) => {
        sent.push(await request.json());
        return response?.() ?? HttpResponse.json({ data: fixture });
      },
    ),
  );
  return sent;
}

function renderInspector(item: ReturnType<typeof creativeWidget>["item"]) {
  return renderWithScope(
    <WidgetInspector
      item={item}
      liveEditing={{
        values: [],
        channel: undefined,
        channels: [],
        onChannelChange: vi.fn(),
        range: { from: "2026-09-01", to: "2026-09-30" },
      }}
      onDirtyChange={vi.fn()}
      scope={scope}
    />,
    { platformRoleCode: "SUPER_ADMIN" },
  );
}

async function openCreative(name: string) {
  await userEvent.click(
    await screen.findByRole("button", { name: `Edit ${name}` }),
  );
}

describe("Creative Performance settings", () => {
  it("lists creatives for the preview's date range", async () => {
    const requests = useCreativesApi();
    renderInspector(creativeWidget().item);
    expect(
      await screen.findByText(sky.original_title, { selector: "p" }),
    ).toBeVisible();
    expect(requests[0]?.searchParams.get("from")).toBe("2026-09-01");
    expect(requests[0]?.searchParams.get("to")).toBe("2026-09-30");
    expect(
      screen.getByText(/can't be corrected yet/, { selector: "p" }),
    ).toBeVisible();
  });

  it("saves metrics, order, names, hiding and pins as one settings object", async () => {
    useCreativesApi();
    const { fixture, item } = creativeWidget({
      limit: 4,
      creative_overrides: { cr_9: { title: "Not listed on this page" } },
    });
    const sent = usePatchApi(fixture);
    renderInspector(item);

    await userEvent.selectOptions(screen.getByLabelText("Order"), "asc");
    await userEvent.click(screen.getByRole("button", { name: "Remove CPA" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Add a metric"),
      "roas",
    );
    await userEvent.click(screen.getByRole("button", { name: "Move ROAS up" }));

    await openCreative(sky.original_title);
    await userEvent.type(
      screen.getByLabelText("Name in the report"),
      "Summer sky banner",
    );
    await userEvent.click(screen.getByLabelText("Pin to the front"));
    await openCreative(field.original_title);
    await userEvent.click(screen.getByLabelText("Hide from this widget"));

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      settings: {
        limit: 4,
        sort_direction: "asc",
        metrics: ["impressions", "ctr", "roas", "conversions"],
        hidden_keys: ["cr_2"],
        pinned_keys: ["cr_1"],
        creative_overrides: {
          cr_9: { title: "Not listed on this page" },
          cr_1: { title: "Summer sky banner" },
        },
      },
    });
  });

  it("unpins a creative when it's hidden and won't pin a hidden one", async () => {
    useCreativesApi();
    renderInspector(creativeWidget({ pinned_keys: ["cr_1"] }).item);
    const pinned = screen.getByRole("group", { name: "Pinned order" });
    expect(
      await within(pinned).findByText(`1. ${sky.original_title}`),
    ).toBeVisible();

    await openCreative(sky.original_title);
    await userEvent.click(screen.getByLabelText("Hide from this widget"));
    expect(screen.getByLabelText("Pin to the front")).not.toBeChecked();
    expect(screen.getByLabelText("Pin to the front")).toBeDisabled();
    expect(
      screen.getByText("A hidden creative can't be pinned."),
    ).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Pinned order" }),
    ).not.toBeInTheDocument();
  });

  it("shows the API's pin error on the creatives list", async () => {
    useCreativesApi();
    const { fixture, item } = creativeWidget();
    usePatchApi(fixture, () =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: {
            "settings.pinned_keys.0": ["A hidden creative cannot be pinned."],
          },
        },
        { status: 422 },
      ),
    );
    renderInspector(item);
    await openCreative(sky.original_title);
    await userEvent.click(screen.getByLabelText("Pin to the front"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("A hidden creative cannot be pinned."),
    ).toBeVisible();
    expect(screen.getByText("Review the highlighted fields.")).toBeVisible();
  });

  it("searches creatives and pages through them", async () => {
    const requests = useCreativesApi([sky], { last_page: 2 });
    renderInspector(creativeWidget().item);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get("page")).toBe("2"),
    );
    await userEvent.type(screen.getByLabelText("Search creatives"), "sky");
    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get("search")).toBe("sky"),
    );
    // A new search starts again from the first page.
    expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
  });

  it("uploads an image straight away and shows why one is refused", async () => {
    useCreativesApi();
    // jsdom's FormData doesn't survive the fetch to MSW, so requests are counted.
    let uploads = 0;
    let isRefused = true;
    server.use(
      http.post(
        reportPaths.layoutItemCreativeThumbnail(1, 20, 7, itemId, "cr_1"),
        () => {
          uploads += 1;
          if (isRefused)
            return HttpResponse.json(
              {
                message: "The given data was invalid.",
                errors: { file: ["Upload a JPEG, PNG or WebP image."] },
              },
              { status: 422 },
            );
          return HttpResponse.json({
            data: {
              key: "cr_1",
              thumbnail_url: "https://cdn.example.test/uploaded.png",
              has_custom_thumbnail: true,
            },
          });
        },
      ),
    );
    const user = userEvent.setup({ applyAccept: false });
    renderInspector(creativeWidget().item);
    await openCreative(sky.original_title);
    const input = screen.getByLabelText(`Image for ${sky.original_title}`);

    // Refused here, without a request.
    await user.upload(
      input,
      new File(["gif"], "sky.gif", { type: "image/gif" }),
    );
    expect(screen.getByText("Upload a JPEG, PNG or WebP image.")).toBeVisible();
    expect(uploads).toBe(0);

    // Refused by the API, which checks the content.
    const png = new File(["png"], "sky.png", { type: "image/png" });
    await user.upload(input, png);
    await waitFor(() => expect(uploads).toBe(1));
    expect(
      await screen.findByText("Upload a JPEG, PNG or WebP image."),
    ).toBeVisible();

    isRefused = false;
    await user.upload(input, png);
    await waitFor(() => expect(uploads).toBe(2));
    await waitFor(() =>
      expect(
        screen.queryByText("Upload a JPEG, PNG or WebP image."),
      ).not.toBeInTheDocument(),
    );
    // Images don't wait for Save.
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("restores the platform image only after confirmation", async () => {
    useCreativesApi([{ ...sky, has_custom_thumbnail: true }]);
    let deletes = 0;
    server.use(
      http.delete(
        reportPaths.layoutItemCreativeThumbnail(1, 20, 7, itemId, "cr_1"),
        () => {
          deletes += 1;
          return HttpResponse.json({
            data: {
              key: "cr_1",
              thumbnail_url: sky.thumbnail_url,
              has_custom_thumbnail: false,
            },
          });
        },
      ),
    );
    renderInspector(creativeWidget().item);
    await openCreative(sky.original_title);
    await userEvent.click(
      screen.getByRole("button", { name: "Use platform image" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Remove the uploaded image?",
    });
    expect(deletes).toBe(0);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Use platform image" }),
    );
    await waitFor(() => expect(deletes).toBe(1));
  });
});
