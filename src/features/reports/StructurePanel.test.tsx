import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { reportPaths } from "@/lib/api/paths";
import { layoutFixture } from "@/mocks/fixtures/reports";
import { server } from "@/mocks/server";
import { renderWithScope } from "@/test/renderWithScope";

import { useReorderLayout, useReportLayout } from "./queries";
import { StructurePanel } from "./StructurePanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const scope = { agencyId: 1, clientId: 20, reportId: 7 };

function Harness() {
  const layout = useReportLayout(scope);
  const reorder = useReorderLayout(scope);
  if (!layout.data) return <p>Loading</p>;
  return (
    <StructurePanel
      onReorder={(order) => reorder.mutate(order)}
      onSelectTab={vi.fn()}
      sections={layout.data.sections}
      selectedTabCode="executive_summary"
    />
  );
}

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

describe("StructurePanel", () => {
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
  });

  it("moves a section and sends the whole top level", async () => {
    const sent = useLayoutApi(() =>
      HttpResponse.json({ data: layoutFixture() }),
    );
    renderWithScope(<Harness />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Move Media Mix Model up" }),
    );
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      items: [
        { id: 4, position: 0, is_enabled: false },
        { id: 1, position: 1, is_enabled: true },
      ],
    });
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
});
