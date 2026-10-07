import { describe, expect, it } from "vitest";

import {
  appliedSelection,
  audienceEntriesShown,
  filterByAudience,
} from "./audience-filter";
import { audienceCode } from "./contracts";

const labels = { south_asian: "South Asian", chinese: "Chinese" };

describe("filterByAudience", () => {
  const kpis = {
    items: [
      { label: "Visits", value: "171K", format: "text" },
      {
        label: "Visits",
        value: "96K",
        format: "text",
        audience: "south_asian",
      },
      { label: "Visits", value: "75K", format: "text", audience: "chinese" },
    ],
  };

  it("shows the totals of a summary list without a filter", () => {
    expect(filterByAudience("kpi_list", kpis, [], labels)).toEqual({
      items: [{ label: "Visits", value: "171K", format: "text" }],
    });
  });

  it("replaces the totals with the selected audience's rows", () => {
    expect(filterByAudience("kpi_list", kpis, ["chinese"], labels)).toEqual({
      items: [{ label: "Visits", value: "75K", format: "text" }],
    });
  });

  it("labels each audience's rows when several are shown, never adding them up", () => {
    expect(
      filterByAudience("kpi_list", kpis, ["south_asian", "chinese"], labels)
        ?.items,
    ).toEqual([
      { label: "Visits – South Asian", value: "96K", format: "text" },
      { label: "Visits – Chinese", value: "75K", format: "text" },
    ]);
  });

  it("is empty when nothing is left for the selection", () => {
    expect(filterByAudience("kpi_list", kpis, ["filipino"], labels)).toBeNull();
  });

  it("keeps every breakdown row without a filter and drops emptied groups with one", () => {
    const content = {
      groups: [
        { key: "visits", label: "Visits" },
        { key: "views", label: "Page views" },
      ],
      items: [
        { group: "visits", label: "Chinese", value: 5, audience: "chinese" },
        {
          group: "views",
          label: "South Asian",
          value: 9,
          audience: "south_asian",
        },
      ],
    };
    expect(
      filterByAudience("progress_list", content, [], labels)?.items,
    ).toHaveLength(2);
    expect(
      filterByAudience("progress_list", content, ["chinese"], labels),
    ).toEqual({
      groups: [{ key: "visits", label: "Visits" }],
      items: [{ group: "visits", label: "Chinese", value: 5 }],
    });
  });

  it("drops the columns and cells of unselected audiences", () => {
    const content = {
      columns: [
        { key: "metric", label: "Metric", format: "text" },
        {
          key: "sa",
          label: "South Asian",
          format: "percent",
          audience: "south_asian",
        },
        { key: "ch", label: "Chinese", format: "percent", audience: "chinese" },
      ],
      rows: [{ metric: "Recall", sa: 7, ch: 4 }],
    };
    expect(
      filterByAudience("data_table", content, ["chinese"], labels),
    ).toEqual({
      columns: [
        { key: "metric", label: "Metric", format: "text" },
        { key: "ch", label: "Chinese", format: "percent" },
      ],
      rows: [{ metric: "Recall", ch: 4 }],
    });
  });

  it("leaves untagged content alone", () => {
    const content = { rows: [{ field: "Household", value: "Large" }] };
    expect(
      filterByAudience("field_table", content, ["chinese"], labels),
    ).toEqual(content);
  });
});

describe("audienceEntriesShown", () => {
  const tags = ["", "south_asian", "chinese", "south_asian"];

  it("shows every entry without a filter or without tags", () => {
    expect(audienceEntriesShown(tags, [])).toEqual([0, 1, 2, 3]);
    expect(audienceEntriesShown(["", ""], ["chinese"])).toEqual([0, 1]);
  });

  it("shows only the selected audiences' entries with a filter", () => {
    expect(audienceEntriesShown(tags, ["south_asian"])).toEqual([1, 3]);
    expect(audienceEntriesShown(tags, ["chinese"], true)).toEqual([0, 2]);
  });
});

describe("audienceCode", () => {
  it("makes a snake case code that no other audience has", () => {
    expect(audienceCode("South Asian", [])).toBe("south_asian");
    expect(audienceCode("South-Asian!", ["south_asian"])).toBe("south_asian_2");
    expect(audienceCode("2nd gen", [])).toBe("nd_gen");
    expect(audienceCode("中文", [])).toBe("audience");
  });

  it("never makes the reserved untagged code", () => {
    expect(audienceCode("Untagged", [])).toBe("untagged_2");
  });
});

describe("appliedSelection", () => {
  const audiences = ["south_asian", "chinese", "filipino"];
  const options = [...audiences, "untagged"];

  it("keeps the selected options in their order", () => {
    expect(appliedSelection(options, ["untagged", "chinese"])).toEqual([
      "chinese",
      "untagged",
    ]);
  });

  it("treats every option selected as no filter", () => {
    expect(appliedSelection(options, [...options])).toEqual([]);
    expect(appliedSelection(audiences, audiences)).toEqual([]);
  });

  it("still filters Reporting when every audience but Untagged is selected", () => {
    expect(appliedSelection(options, audiences)).toEqual(audiences);
  });

  it("ignores Untagged for entered content", () => {
    expect(appliedSelection(audiences, ["untagged"])).toEqual([]);
    expect(appliedSelection(audiences, ["chinese", "untagged"])).toEqual([
      "chinese",
    ]);
  });
});
