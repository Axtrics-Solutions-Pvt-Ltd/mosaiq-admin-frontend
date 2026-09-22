import type {
  UpdateWorkspaceCurationRequest,
  WorkspaceCurationRecord,
} from "./contracts";
import type { WorkspaceCurationView } from "./view-model";

function byPosition<T extends { position: number }>(items: readonly T[]) {
  return [...items].sort((a, b) => a.position - b.position);
}

export function toWorkspaceCurationView(
  record: WorkspaceCurationRecord,
): WorkspaceCurationView {
  return {
    workspaceId: record.workspace_id,
    modules: byPosition(record.modules).map((module) => ({
      id: module.id,
      code: module.code,
      name: module.name,
      isEnabled: module.is_enabled,
      kpis: byPosition(module.kpis).map((kpi) => ({
        id: kpi.id,
        code: kpi.code,
        name: kpi.name,
        isEnabled: kpi.is_enabled,
      })),
    })),
  };
}

export function toUpdateWorkspaceCurationRequest(
  draft: WorkspaceCurationView,
): UpdateWorkspaceCurationRequest {
  return {
    modules: draft.modules.map((module) => ({
      id: module.id,
      is_enabled: module.isEnabled,
      kpis: module.kpis.map((kpi) => ({
        id: kpi.id,
        is_enabled: kpi.isEnabled,
      })),
    })),
  };
}
