import { describe, expect, it } from "vitest";

import { layoutFixture } from "@/mocks/fixtures/reports";

import { layoutResponseSchema } from "./contracts";
import {
  applyOrder,
  defaultTabCode,
  findTab,
  moveInOrder,
  replaceLayoutItem,
  toggleInOrder,
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

  it("opens the first shown tab and serves a flat section as one tab", () => {
    expect(defaultTabCode(sections())).toBe("executive_summary");
    expect(findTab(sections(), "mmm")?.section.code).toBe("mmm");
  });
});
