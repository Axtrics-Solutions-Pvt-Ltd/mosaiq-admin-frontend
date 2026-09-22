import { describe, expect, it } from "vitest";

import { toWorkspaceCurationView } from "./remote-model";
import {
  isWorkspaceCurationDirty,
  toggleKpiEnabled,
  toggleModuleEnabled,
} from "./view-model";

const record = {
  workspace_id: 9,
  modules: [
    {
      id: 2,
      code: "marketing",
      name: "Marketing Intelligence",
      is_enabled: true,
      position: 2,
      kpis: [
        {
          id: 20,
          code: "marketing.spend",
          name: "Spend",
          is_enabled: true,
          position: 2,
        },
        {
          id: 21,
          code: "marketing.roas",
          name: "ROAS",
          is_enabled: false,
          position: 1,
        },
      ],
    },
    {
      id: 1,
      code: "reporting",
      name: "Reporting",
      is_enabled: true,
      position: 1,
      kpis: [],
    },
  ],
};

describe("curation view model", () => {
  it("orders modules and KPIs by their API position", () => {
    const view = toWorkspaceCurationView(record);
    expect(view.modules.map((module) => module.code)).toEqual([
      "reporting",
      "marketing",
    ]);
    expect(view.modules[1]?.kpis.map((kpi) => kpi.code)).toEqual([
      "marketing.roas",
      "marketing.spend",
    ]);
  });

  it("is not dirty until a module or KPI toggle changes", () => {
    const saved = toWorkspaceCurationView(record);
    expect(isWorkspaceCurationDirty(saved, saved)).toBe(false);

    const draft = toggleModuleEnabled(saved, 1);
    expect(isWorkspaceCurationDirty(saved, draft)).toBe(true);
  });

  it("toggles a single KPI without affecting its siblings", () => {
    const saved = toWorkspaceCurationView(record);
    const draft = toggleKpiEnabled(saved, 2, 21);
    const marketing = draft.modules.find((module) => module.id === 2);
    expect(marketing?.kpis.find((kpi) => kpi.id === 21)?.isEnabled).toBe(true);
    expect(marketing?.kpis.find((kpi) => kpi.id === 20)?.isEnabled).toBe(true);
    expect(isWorkspaceCurationDirty(saved, draft)).toBe(true);
  });
});
