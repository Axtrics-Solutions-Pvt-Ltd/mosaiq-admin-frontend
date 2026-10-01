import { describe, expect, it } from "vitest";

import { layoutFixture } from "@/mocks/fixtures/reports";

import { layoutResponseSchema } from "./contracts";
import {
  accentStyle,
  applyOrder,
  defaultTabCode,
  findTab,
  moveInOrder,
  moveToInOrder,
  replaceLayoutItem,
  tabsOf,
  toggleInOrder,
  withPausedTabs,
} from "./layout";

const sections = () =>
  layoutResponseSchema.parse({ data: layoutFixture() }).data.sections;

describe("layout helpers", () => {
  it("sends every sibling, renumbered, when one moves", () => {
    const tabs = sections()[0]!.children;
    expect(moveInOrder(tabs, 3, -1)).toEqual([
      { id: 3, position: 0, is_enabled: true },
      { id: 2, position: 1, is_enabled: true },
    ]);
    expect(moveInOrder(tabs, 2, -1)).toBeUndefined();
  });

  it("shifts the items between when one is dropped on another's place", () => {
    const tab = sections()[0]!.children[0]!;
    const siblings = [0, 1, 2].map((position) => ({
      ...tab,
      id: 10 + position,
      position,
      is_enabled: position !== 1,
    }));
    expect(moveToInOrder(siblings, 10, 12)).toEqual([
      { id: 11, position: 0, is_enabled: false },
      { id: 12, position: 1, is_enabled: true },
      { id: 10, position: 2, is_enabled: true },
    ]);
    expect(moveToInOrder(siblings, 12, 10)?.map((item) => item.id)).toEqual([
      12, 10, 11,
    ]);
    expect(moveToInOrder(siblings, 11, 11)).toBeUndefined();
  });

  it("sends every sibling with the changed flag when one is toggled", () => {
    expect(toggleInOrder(sections(), 4, true)).toEqual([
      { id: 1, position: 0, is_enabled: true },
      { id: 4, position: 1, is_enabled: true },
    ]);
  });

  it("applies an order to the cached tree", () => {
    const reordered = applyOrder(sections(), [
      { id: 1, position: 1, is_enabled: true },
      { id: 4, position: 0, is_enabled: true },
    ]);
    expect(
      reordered.map((section) => [section.code, section.is_enabled]),
    ).toEqual([
      ["mmm", true],
      ["reporting", true],
    ]);
  });

  it("keeps cached children when an item comes back without them", () => {
    const tree = sections();
    const tab = { ...tree[0]!.children[0]!, title: "Summary", children: [] };
    const replaced = replaceLayoutItem(tree, tab);
    expect(replaced[0]!.children[0]!.title).toBe("Summary");
    expect(replaced[0]!.children[0]!.children).toHaveLength(2);
  });

  it("leaves the paused Reports tab out but keeps it in a tab reorder", () => {
    const section = sections()[0]!;
    const reports = {
      ...section.children[1]!,
      id: 9,
      code: "reports",
      position: 2,
      is_enabled: false,
      children: [],
    };
    const withReports = {
      ...section,
      children: [...section.children, reports],
    };
    expect(tabsOf(withReports).map((tab) => tab.code)).not.toContain("reports");
    expect(findTab([withReports], "reports")).toBeUndefined();
    expect(
      withPausedTabs(withReports, moveInOrder(tabsOf(withReports), 3, -1)!),
    ).toEqual([
      { id: 3, position: 0, is_enabled: true },
      { id: 2, position: 1, is_enabled: true },
      { id: 9, position: 2, is_enabled: false },
    ]);
  });

  it("opens the first shown tab and serves a flat section as one tab", () => {
    expect(defaultTabCode(sections())).toBe("executive_summary");
    expect(findTab(sections(), "mmm")?.section.code).toBe("mmm");
  });

  it("reads section colours, with tabs and widgets following their section", () => {
    const layout = layoutResponseSchema.parse({ data: layoutFixture() }).data;
    expect(layout.accents.map((accent) => accent.key)).toEqual([
      "blue",
      "indigo",
      "teal",
      "violet",
      "rose",
      "amber",
      "emerald",
      "slate",
    ]);
    const reporting = layout.sections[0]!;
    expect(reporting.accent).toMatchObject({ key: "blue", is_default: true });
    expect(reporting.children[0]!.accent).toBeNull();
    expect(accentStyle(reporting.accent)).toEqual({
      "--section-accent": "#2563EB",
      "--section-accent-strong": "#1D4ED8",
      "--section-accent-soft": "#EFF6FF",
    });
    expect(accentStyle(null)).toBeUndefined();
  });

  it("reads a layout from an API without section colours", () => {
    const fixture = layoutFixture();
    const { accents: _accents, ...withoutAccents } = fixture;
    const layout = layoutResponseSchema.parse({
      data: {
        ...withoutAccents,
        sections: fixture.sections.map(({ accent: _accent, ...item }) => item),
      },
    }).data;
    expect(layout.accents).toEqual([]);
    expect(layout.sections[0]!.accent).toBeNull();
  });
});
