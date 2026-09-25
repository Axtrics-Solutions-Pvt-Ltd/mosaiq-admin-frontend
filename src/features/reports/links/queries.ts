import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/features/dashboard/queries";

import type { ReportScope } from "../api";
import { reportKeys } from "../queries";
import {
  createShareLink,
  listShareLinks,
  regenerateShareLink,
  revokeShareLink,
  updateShareLink,
} from "./api";
import type {
  ShareLinkCreateRequest,
  ShareLinkUpdateRequest,
} from "./contracts";

export const shareLinkKeys = {
  list: ({ agencyId, clientId, reportId }: ReportScope) =>
    ["reports", "links", agencyId, clientId, reportId] as const,
};

const valid = (id: number) => Number.isSafeInteger(id) && id > 0;

export function useShareLinks(scope: ReportScope, isEnabled = true) {
  return useQuery({
    queryKey: shareLinkKeys.list(scope),
    queryFn: ({ signal }) => listShareLinks(scope, signal),
    enabled:
      isEnabled &&
      valid(scope.agencyId) &&
      valid(scope.clientId) &&
      valid(scope.reportId),
  });
}

// Every change can alter status, expiry or the set of links, so the list is
// refetched from the API rather than patched locally. The active link counts
// on the report (list rows, builder Share button) and the dashboard are
// computed by the API, so they are refetched too.
function useRefreshLinks(scope: ReportScope) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: shareLinkKeys.list(scope) }),
      client.invalidateQueries({ queryKey: reportKeys.lists }),
      client.invalidateQueries({ queryKey: reportKeys.detail(scope) }),
      client.invalidateQueries({ queryKey: dashboardKeys.summary }),
    ]);
}

export function useCreateShareLink(scope: ReportScope) {
  const refresh = useRefreshLinks(scope);
  return useMutation({
    mutationFn: (payload: ShareLinkCreateRequest) =>
      createShareLink(scope, payload),
    onSuccess: refresh,
  });
}

export function useUpdateShareLink(scope: ReportScope) {
  const refresh = useRefreshLinks(scope);
  return useMutation({
    mutationFn: ({
      linkId,
      payload,
    }: {
      linkId: number;
      payload: ShareLinkUpdateRequest;
    }) => updateShareLink(scope, linkId, payload),
    onSuccess: refresh,
  });
}

export function useRevokeShareLink(scope: ReportScope) {
  const refresh = useRefreshLinks(scope);
  return useMutation({
    mutationFn: (linkId: number) => revokeShareLink(scope, linkId),
    onSuccess: refresh,
  });
}

export function useRegenerateShareLink(scope: ReportScope) {
  const refresh = useRefreshLinks(scope);
  return useMutation({
    mutationFn: (linkId: number) => regenerateShareLink(scope, linkId),
    onSuccess: refresh,
  });
}
