import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getWorkspaceCuration, updateWorkspaceCuration } from "./api";
import type { UpdateWorkspaceCurationRequest } from "./contracts";

export const curationKeys = {
  all: ["curation"] as const,
  detail: (workspaceId: number) => ["curation", "detail", workspaceId] as const,
};

const valid = (id: number) => Number.isSafeInteger(id) && id > 0;

export function useWorkspaceCuration(workspaceId: number) {
  return useQuery({
    queryKey: curationKeys.detail(workspaceId),
    queryFn: ({ signal }) => getWorkspaceCuration(workspaceId, signal),
    enabled: valid(workspaceId),
  });
}

export function useUpdateWorkspaceCuration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      payload,
    }: {
      workspaceId: number;
      payload: UpdateWorkspaceCurationRequest;
    }) => updateWorkspaceCuration(workspaceId, payload),
    onSuccess: (record) => {
      queryClient.setQueryData(
        curationKeys.detail(record.workspace_id),
        record,
      );
    },
  });
}
