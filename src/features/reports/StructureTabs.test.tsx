import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { reportPaths } from "@/lib/api/paths";
import { layoutFixture } from "@/mocks/fixtures/reports";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { useReorderLayout, useReportLayout } from "./queries";
import { ReportCanvas } from "./ReportCanvas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const scope = { agencyId: 1, clientId: 20, reportId: 7 };

function Harness({
  onEditSection = vi.fn(),
}: {
  onEditSection?: (itemId: number) => void;
}) {
  const layout = useReportLayout(scope);
  const reorder = useReorderLayout(scope);
  if (!layout.data) return <p>Loading</p>;
  return (
    <ReportCanvas
      currency="USD"
      onAddBudgets={vi.fn()}
      onChannelSelect={vi.fn()}
      onEditSection={onEditSection}
      onEditWidget={vi.fn()}
      onReorder={(order) => reorder.mutate(order)}
      onSelectTab={vi.fn()}
      onToggleWidget={vi.fn()}
      preview={{
        widgets: undefined,
        isPending: false,
        isFetching: false,
        error: null,
      }}
      sections={layout.data.sections}
      selectedItemId={undefined}
      selectedTabCode="executive_summary"
      valueAdornment={() => undefined}
    />
  );
}

// jsdom can't open a popover, so a Move menu stays hidden (and nameless to
// role queries); it is found from its trigger and its options by text.
async function moveMenu(name: string) {
  const trigger = await screen.findByRole("button", { name });
  return document.getElementById(trigger.getAttribute("popovertarget")!)!;
}
const menuButton = (menu: HTMLElement, name: string) =>
  within(menu).getByText(name);

function useLayoutApi(orderResponse: () => Response) {
  const sent: unknown[] = [];
  server.use(
    http.get(reportPaths.layout(1, 20, 7), () =>
      HttpResponse.json({ data: layoutFixture() }),
    ),
    http.put(reportPaths.layoutOrder(1, 20, 7), async ({ request }) => {
      sent.push(await request.json());
      return orderResponse();
    }),
  );
  return sent;
}

describe("Structure tabs", () => {
  it("hides a tab by sending its siblings with the new flag", async () => {
    const sent = useLayoutApi(() => {
      const layout = layoutFixture();
      layout.sections[0]!.children[1]!.is_enabled = false;
      return HttpResponse.json({ data: layout });
    });
    renderWithScope(<Harness />);
    const checkbox = await screen.findByRole("checkbox", {
      name: "Show Detailed Metrics in the portal",
    });
    await userEvent.click(checkbox);
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      items: [
        { id: 2, position: 0, is_enabled: true },
        { id: 3, position: 1, is_enabled: false },
      ],
    });
    expect(checkbox).not.toBeChecked();
    expect(
      screen.getByRole("button", {
        name: "Detailed Metrics (hidden from portal)",
      }),
    ).toBeVisible();
  });

  it("moves a section from its menu and sends the whole top level", async () => {
    const sent = useLayoutApi(() =>
      HttpResponse.json({ data: layoutFixture() }),
    );
    renderWithScope(<Harness />);
    const menu = await moveMenu("Media Mix Model options");
    expect(menuButton(menu, "Move right")).toBeDisabled();
    await userEvent.click(menuButton(menu, "Move left"));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      items: [
        { id: 4, position: 0, is_enabled: false },
        { id: 1, position: 1, is_enabled: true },
      ],
    });
  });

  it("moves a widget from its menu within its tab", async () => {
    const sent = useLayoutApi(() =>
      HttpResponse.json({ data: layoutFixture() }),
    );
    renderWithScope(<Harness />);
    const menu = await moveMenu("Move AI Summary");
    expect(menuButton(menu, "Move up")).toBeDisabled();
    await userEvent.click(menuButton(menu, "Move down"));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      items: [
        { id: 11, position: 0, is_enabled: true },
        { id: 10, position: 1, is_enabled: true },
      ],
    });
  });

  it("offers a drag handle on tabs but not on widgets on a phone", async () => {
    useLayoutApi(() => HttpResponse.json({ data: layoutFixture() }));
    renderWithScope(<Harness />);
    expect(
      await screen.findByRole("button", {
        name: "Drag Detailed Metrics to reorder",
      }),
    ).toBeVisible();
    // jsdom has no matchMedia, so the canvas lays out as on a phone.
    expect(
      screen.queryByRole("button", { name: "Drag AI Summary to reorder" }),
    ).not.toBeInTheDocument();
  });

  it("rolls the change back when the API rejects it", async () => {
    let release: () => void = () => {};
    const answered = new Promise<void>((resolve) => (release = resolve));
    useLayoutApi(() => {
      release();
      return HttpResponse.json(
        { message: "The given data was invalid." },
        { status: 422 },
      );
    });
    renderWithScope(<Harness />);
    const checkbox = await screen.findByRole("checkbox", {
      name: "Show Detailed Metrics in the portal",
    });
    await userEvent.click(checkbox);
    await answered;
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("can't enable an item whose widgets haven't shipped", async () => {
    server.use(
      http.get(reportPaths.layout(1, 20, 7), () => {
        const layout = layoutFixture();
        layout.sections[0]!.children[1]!.is_available = false;
        layout.sections[0]!.children[1]!.is_enabled = false;
        return HttpResponse.json({ data: layout });
      }),
    );
    renderWithScope(<Harness />);
    expect(
      await screen.findByRole("checkbox", {
        name: "Show Detailed Metrics in the portal",
      }),
    ).toBeDisabled();
    expect(screen.getByText("Coming soon")).toBeVisible();
  });

  it("fills the selected section in its colour and tints the others and its tab panel", async () => {
    useLayoutApi(() => HttpResponse.json({ data: layoutFixture() }));
    renderWithScope(<Harness />);
    const section = await screen.findByRole("button", {
      name: "Reporting Dashboard",
    });
    const item = section.closest("li")!;
    expect(item).toHaveClass("bg-[color:var(--section-accent-strong)]");
    expect(item.style.getPropertyValue("--section-accent-strong")).toBe(
      "#1D4ED8",
    );
    const other = screen.getByRole("button", {
      name: /^Media Mix Model(?! options)/,
    });
    expect(other).toHaveClass("text-[color:var(--section-accent-strong)]");
    expect(other.closest("li")).toHaveClass(
      "bg-[color:var(--section-accent-soft)]",
    );
    // The active tab is underlined in the strong colour, not filled.
    const activeTab = screen.getByRole("button", { name: "Executive Summary" });
    expect(activeTab).toHaveClass("text-[color:var(--section-accent-strong)]");
    expect(activeTab.closest("li")).toHaveClass(
      "border-[color:var(--section-accent-strong)]",
    );
    expect(activeTab.closest("li")).not.toHaveClass(
      "bg-[color:var(--section-accent-strong)]",
    );
    const tabs = screen.getByRole("navigation", {
      name: "Reporting Dashboard tabs",
    });
    expect(tabs.style.getPropertyValue("--section-accent-strong")).toBe(
      "#1D4ED8",
    );
    expect(tabs.style.getPropertyValue("--section-accent-soft")).toBe(
      "#EFF6FF",
    );
  });

  it("falls back to the primary blue when a section has no colour", async () => {
    server.use(
      http.get(reportPaths.layout(1, 20, 7), () => {
        const layout = layoutFixture();
        layout.sections[0]!.accent = null;
        return HttpResponse.json({ data: layout });
      }),
    );
    renderWithScope(<Harness />);
    const section = await screen.findByRole("button", {
      name: "Reporting Dashboard",
    });
    expect(
      section.closest("li")!.style.getPropertyValue("--section-accent-strong"),
    ).toBe("var(--color-primary)");
    const tabs = screen.getByRole("navigation", {
      name: "Reporting Dashboard tabs",
    });
    expect(tabs.style.getPropertyValue("--section-accent-soft")).toBe(
      "var(--color-primary-soft)",
    );
  });

  it("opens a section's colour and title from its menu", async () => {
    useLayoutApi(() => HttpResponse.json({ data: layoutFixture() }));
    const onEditSection = vi.fn();
    renderWithScope(<Harness onEditSection={onEditSection} />);
    const menu = await moveMenu("Media Mix Model options");
    expect(menuButton(menu, "Move left")).toBeEnabled();
    await userEvent.click(menuButton(menu, "Colour and title"));
    expect(onEditSection).toHaveBeenCalledWith(4);
    const tabMenu = await moveMenu("Move Executive Summary");
    expect(within(tabMenu).queryByText("Colour and title")).toBeNull();
  });
});
