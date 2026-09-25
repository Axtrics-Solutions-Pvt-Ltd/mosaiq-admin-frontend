import { apiRequest } from "@/lib/api/client";
import { reportPaths } from "@/lib/api/paths";

import type { ReportScope } from "../api";
import {
  type ShareLinkCreateRequest,
  shareLinkListSchema,
  shareLinkResponseSchema,
  type ShareLinkUpdateRequest,
} from "./contracts";

export async function listShareLinks(
  { agencyId, clientId, reportId }: ReportScope,
  signal?: AbortSignal,
) {
  const result = await apiRequest<unknown>(
    reportPaths.links(agencyId, clientId, reportId),
    { signal },
  );
  return shareLinkListSchema.parse(result).data;
}

export async function createShareLink(
  { agencyId, clientId, reportId }: ReportScope,
  payload: ShareLinkCreateRequest,
) {
  const result = await apiRequest<unknown>(
    reportPaths.links(agencyId, clientId, reportId),
    { method: "POST", body: payload },
  );
  return shareLinkResponseSchema.parse(result).data;
}

export async function updateShareLink(
  { agencyId, clientId, reportId }: ReportScope,
  linkId: number,
  payload: ShareLinkUpdateRequest,
) {
  const result = await apiRequest<unknown>(
    reportPaths.link(agencyId, clientId, reportId, linkId),
    { method: "PUT", body: payload },
  );
  return shareLinkResponseSchema.parse(result).data;
}

export async function revokeShareLink(
  { agencyId, clientId, reportId }: ReportScope,
  linkId: number,
) {
  const result = await apiRequest<unknown>(
    reportPaths.linkRevoke(agencyId, clientId, reportId, linkId),
    { method: "POST" },
  );
  return shareLinkResponseSchema.parse(result).data;
}

// Returns the replacement link; the original is revoked.
export async function regenerateShareLink(
  { agencyId, clientId, reportId }: ReportScope,
  linkId: number,
) {
  const result = await apiRequest<unknown>(
    reportPaths.linkRegenerate(agencyId, clientId, reportId, linkId),
    { method: "POST" },
  );
  return shareLinkResponseSchema.parse(result).data;
}
