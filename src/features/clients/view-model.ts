import type { ClientRecord } from "@/features/workspaces/contracts";

export type ClientSummary = {
  id: string;
  name: string;
  agencyId: number;
  agencyName: string;
  status: "active" | "inactive";
  workspaceCount: number;
  createdAt: string;
};

export function toClientSummary(
  record: ClientRecord,
  agencyName: string,
): ClientSummary {
  return {
    id: String(record.id),
    name: record.name,
    agencyId: record.agency_id,
    agencyName,
    status: record.status,
    workspaceCount: record.workspace_count ?? 0,
    createdAt: record.created_at ?? "",
  };
}
