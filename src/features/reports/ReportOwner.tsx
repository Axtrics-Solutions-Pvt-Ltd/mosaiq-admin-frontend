"use client";

import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useAgencies } from "@/features/agencies/queries";
import { useCurrentUser } from "@/features/auth/queries";
import { useClients } from "@/features/workspaces/queries";
import { useScope } from "@/providers/ScopeProvider";

// Reports are listed and created per client. This resolves the agency and
// client from the URL, falling back to the header scope and then the first
// available choice, the way the workspace screens do.
export function useReportOwner(
  requestedAgencyId: number,
  requestedClientId: number,
) {
  const user = useCurrentUser();
  const scope = useScope();
  const isSuperAdmin = user.data?.platformRoleCode === "SUPER_ADMIN";
  // Only a Super Admin can list agencies; everyone else works in their own.
  const agencies = useAgencies({ page: 1 }, { enabled: isSuperAdmin });
  const agencyId = isSuperAdmin
    ? requestedAgencyId || scope.agencyId || agencies.data?.data[0]?.id || 0
    : (user.data?.membership?.agencyId ?? 0);
  // For a Manager the API lists only the clients they can view.
  const clients = useClients(agencyId);
  const clientList = clients.data?.data ?? [];
  const clientId =
    (clientList.some((client) => client.id === requestedClientId)
      ? requestedClientId
      : 0) ||
    clientList[0]?.id ||
    0;
  return {
    agencyId,
    clientId,
    isSuperAdmin,
    agencies: agencies.data?.data ?? [],
    clients: clientList,
    client: clientList.find((client) => client.id === clientId),
    isPending:
      user.isPending ||
      (isSuperAdmin && agencies.isPending) ||
      (agencyId > 0 && clients.isPending),
    isError: agencies.isError || clients.isError,
    refetch: () => {
      void agencies.refetch();
      void clients.refetch();
    },
  };
}

export function ReportOwnerFields({
  idPrefix,
  owner,
  onChange,
}: {
  idPrefix: string;
  owner: ReturnType<typeof useReportOwner>;
  onChange: (agencyId: number, clientId: number) => void;
}) {
  return (
    <>
      {owner.isSuperAdmin && (
        <div>
          <Label htmlFor={`${idPrefix}-agency`}>Agency</Label>
          <Select
            className="mt-1.5"
            id={`${idPrefix}-agency`}
            onChange={(event) => onChange(Number(event.target.value), 0)}
            value={owner.agencyId || ""}
          >
            <option value="">Select agency</option>
            {owner.agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.display_name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div>
        <Label htmlFor={`${idPrefix}-client`}>Client</Label>
        <Select
          className="mt-1.5"
          disabled={owner.clients.length === 0}
          id={`${idPrefix}-client`}
          onChange={(event) =>
            onChange(owner.agencyId, Number(event.target.value))
          }
          value={owner.clientId || ""}
        >
          {owner.clients.length === 0 && <option value="">No clients</option>}
          {owner.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </div>
    </>
  );
}
