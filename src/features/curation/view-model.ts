export type CurationKpiView = {
  id: number;
  code: string;
  name: string;
  isEnabled: boolean;
};

export type CurationModuleView = {
  id: number;
  code: string;
  name: string;
  isEnabled: boolean;
  kpis: CurationKpiView[];
};

export type WorkspaceCurationView = {
  workspaceId: number;
  modules: CurationModuleView[];
};

export function toggleModuleEnabled(
  draft: WorkspaceCurationView,
  moduleId: number,
): WorkspaceCurationView {
  return {
    ...draft,
    modules: draft.modules.map((module) =>
      module.id === moduleId
        ? { ...module, isEnabled: !module.isEnabled }
        : module,
    ),
  };
}

export function toggleKpiEnabled(
  draft: WorkspaceCurationView,
  moduleId: number,
  kpiId: number,
): WorkspaceCurationView {
  return {
    ...draft,
    modules: draft.modules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            kpis: module.kpis.map((kpi) =>
              kpi.id === kpiId ? { ...kpi, isEnabled: !kpi.isEnabled } : kpi,
            ),
          }
        : module,
    ),
  };
}

export function isWorkspaceCurationDirty(
  saved: WorkspaceCurationView,
  draft: WorkspaceCurationView,
): boolean {
  if (saved.modules.length !== draft.modules.length) return true;
  return saved.modules.some((savedModule, index) => {
    const draftModule = draft.modules[index];
    if (!draftModule) return true;
    if (savedModule.isEnabled !== draftModule.isEnabled) return true;
    if (savedModule.kpis.length !== draftModule.kpis.length) return true;
    return savedModule.kpis.some(
      (savedKpi, kpiIndex) =>
        savedKpi.isEnabled !== draftModule.kpis[kpiIndex]?.isEnabled,
    );
  });
}
