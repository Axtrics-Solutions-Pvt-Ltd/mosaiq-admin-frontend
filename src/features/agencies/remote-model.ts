import { formatDate } from "@/lib/formatters";

import type {
  AgencyListResponse,
  AgencyProfile,
  AgencyRecord,
} from "./contracts";
import type { AgencyDetail, AgencySummary } from "./view-model";

const present = (value: string | null | undefined) => value || "--";

export function profileFromRecord(record: AgencyRecord): AgencyProfile {
  return {
    display_name: record.display_name,
    legal_name: record.legal_name,
    description: record.description,
    website: record.website,
    status: record.status,
    brand_color: record.brand_color,
    primary_contact: record.primary_contact,
    defaults: record.defaults,
  };
}

export function toAgencySummary(
  record: AgencyListResponse["data"][number],
): AgencySummary {
  return {
    id: String(record.id),
    name: record.display_name,
    logoTone: "blue",
    logoUrl: record.logo_url,
    primaryAdmin: {
      name: record.primary_admin?.name ?? "Not assigned",
      email: record.primary_admin?.email ?? "",
    },
    workspaces: record.workspace_count,
    users: record.user_count,
    currency: record.default_currency,
    status: record.status,
    createdAt: record.created_at ?? "",
    lastActivity: record.last_activity_at
      ? formatDate(record.last_activity_at)
      : "No activity",
  };
}

export function toAgencyDetail(record: AgencyRecord): AgencyDetail {
  return {
    id: String(record.id),
    name: record.display_name,
    displayName: record.display_name,
    logoTone: "blue",
    logoUrl: record.logo_url,
    primaryAdmin: { name: "Not assigned", email: "" },
    workspaces: record.workspace_count,
    users: record.user_count,
    currency: record.defaults.currency,
    status: record.status,
    createdAt: record.created_at ?? "",
    lastActivity: "--",
    legalName: present(record.legal_name),
    description: present(record.description),
    website: present(record.website),
    brandColor: record.brand_color ?? "--",
    primaryContact: {
      name: present(record.primary_contact.name),
      email: present(record.primary_contact.email),
      phone: present(record.primary_contact.phone),
      jobTitle: present(record.primary_contact.job_title),
    },
    timeZone: record.defaults.time_zone,
    language: record.defaults.language,
    reportingWeek: record.defaults.reporting_week_start,
    dateFormat: record.defaults.date_format,
    workspaceRecords: record.workspaces.map((workspace) => ({
      id: String(workspace.id),
      name: workspace.name,
      status: workspace.status,
      dataSource: workspace.data_source_label ?? "No data source",
    })),
    administrators: record.administrators.map((admin) => ({
      id: String(admin.id),
      name: admin.name,
      role: admin.role_code,
      status: admin.status,
    })),
    activity: record.recent_activity.map((entry) => ({
      id: String(entry.id),
      title: entry.title,
      description: entry.description,
      time: entry.occurred_at ? formatDate(entry.occurred_at) : "--",
    })),
  };
}
