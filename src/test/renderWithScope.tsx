import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { authKeys } from "@/features/auth/queries";
import { ScopeProvider } from "@/providers/ScopeProvider";

type MembershipFixture = {
  agencyId: number;
  roleCode: string;
  clientId?: number | null;
  workspaceIds?: (number | null)[];
};

export function renderWithScope(
  ui: ReactElement,
  options?: {
    platformRoleCode?: string | null;
    membership?: MembershipFixture | null;
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(authKeys.me(), {
    id: 1,
    name: options?.membership ? "Agency Admin" : "Super Admin",
    email: "user@example.test",
    platformRoleCode: options?.platformRoleCode ?? null,
    membership: options?.membership
      ? {
          agencyId: options.membership.agencyId,
          roleCode: options.membership.roleCode,
          clientId: options.membership.clientId ?? null,
          workspaceIds: options.membership.workspaceIds ?? [],
        }
      : null,
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ScopeProvider>{ui}</ScopeProvider>
      </QueryClientProvider>,
    ),
  };
}
