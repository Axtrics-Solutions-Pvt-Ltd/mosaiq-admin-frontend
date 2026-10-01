import { formatNumber } from "@/lib/formatters";

import type { AuditCategory } from "./contracts";

export const auditCategoryLabels: Record<AuditCategory, string> = {
  agency: "Agencies",
  client: "Clients",
  workspace: "Workspaces",
  user: "Users",
  invitation: "Invitations",
  report: "Reports",
  channel: "Channels",
  budget: "Budgets",
  metric: "Metric corrections",
};

const actionLabels: Record<string, string> = {
  "agency.created": "Agency created",
  "agency.updated": "Agency details updated",
  "agency.status_changed": "Agency status changed",
  "agency.logo_updated": "Agency logo uploaded",
  "agency.logo_removed": "Agency logo removed",
  "client.created": "Client created",
  "client.updated": "Client details updated",
  "client.status_changed": "Client status changed",
  "workspace.created": "Workspace created",
  "workspace.updated": "Workspace details updated",
  "workspace.status_changed": "Workspace status changed",
  "workspace.deleted": "Workspace deleted",
  "workspace.credentials_updated": "Connection credentials saved",
  "workspace.credentials_cleared": "Workspace disconnected",
  "workspace.fetched": "Channel data fetched",
  "workspace.sample_generated": "Sample data generated",
  "user.created": "User account created",
  "user.updated": "User details updated",
  "user.role_changed": "User role changed",
  "user.access_changed": "User access changed",
  "user.status_changed": "User status changed",
  "invitation.created": "Invitation sent",
  "invitation.resent": "Invitation resent",
  "invitation.accepted": "Invitation accepted",
  "invitation.rejected": "Invitation declined",
  "invitation.revoked": "Invitation revoked",
  "report.created": "Report created",
  "report.updated": "Report settings updated",
  "report.deleted": "Report deleted",
  "report.duplicated": "Report duplicated",
  "report.sources_updated": "Report workspaces changed",
  "report.layout_updated": "Report layout changed",
  "report.layout_item_reset": "Report section reset",
  "report.content_updated": "Report content edited",
  "report.link_created": "Share link created",
  "report.link_updated": "Share link updated",
  "report.link_regenerated": "Share link regenerated",
  "report.link_revoked": "Share link revoked",
  "report.export_requested": "PDF export requested",
  "report.export_retried": "PDF export retried",
  "report.export_deleted": "PDF export deleted",
  "report.schedule_created": "Report schedule created",
  "report.schedule_updated": "Report schedule updated",
  "report.schedule_deleted": "Report schedule deleted",
  "report.schedule_run": "Scheduled report generated",
  "channel.created": "Channel added",
  "channel.updated": "Channel updated",
  "budget.updated": "Budget updated",
  "metric.corrected": "Metric corrected",
  "metric.correction_reverted": "Metric correction reverted",
};

/** A readable label for an audit action, falling back to the action code. */
export function auditActionLabel(action: string) {
  if (Object.hasOwn(actionLabels, action)) return actionLabels[action]!;
  const words = action.replaceAll(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** One short detail line from the event metadata, when it has a useful one. */
export function auditActionDetail(event: {
  action: string;
  metadata: Record<string, unknown> | null;
}) {
  const metadata = event.metadata ?? {};
  if (
    event.action.endsWith(".status_changed") &&
    typeof metadata.status === "string"
  )
    return `Now ${metadata.status}`;
  if (
    event.action === "user.role_changed" &&
    typeof metadata.role_code === "string"
  )
    return `Now ${metadata.role_code.replaceAll("_", " ").toLowerCase()}`;
  if (
    (event.action === "workspace.fetched" ||
      event.action === "workspace.sample_generated") &&
    typeof metadata.rows_upserted === "number"
  )
    return `${formatNumber(metadata.rows_upserted)} rows`;
  if (
    event.action.startsWith("metric.") &&
    typeof metadata.metric_code === "string"
  )
    return metadata.metric_code;
  if (
    event.action.endsWith(".updated") &&
    Array.isArray(metadata.changed_fields) &&
    metadata.changed_fields.length > 0
  )
    return metadata.changed_fields.join(", ").replaceAll("_", " ");
  return null;
}
