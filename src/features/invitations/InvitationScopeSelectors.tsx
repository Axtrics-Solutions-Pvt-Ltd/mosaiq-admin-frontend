"use client";

import { X } from "lucide-react";
import { useCallback, useState } from "react";

import { PaginatedCombobox } from "@/components/shared/PaginatedCombobox";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import type {
  ClientRecord,
  WorkspaceRecord,
} from "@/features/workspaces/contracts";
import {
  useInfiniteClients,
  useInfiniteWorkspaces,
} from "@/features/workspaces/queries";

function uniqueById<Option extends { id: number }>(options: Option[]) {
  return [...new Map(options.map((option) => [option.id, option])).values()];
}

export function InvitationScopeSelectors({
  agencyId,
  client,
  clientError,
  email,
  isClientUser,
  onClientChange,
  onWorkspacesChange,
  roleCode,
  workspaceError,
  workspaces,
}: {
  agencyId: number;
  client?: ClientRecord;
  clientError?: string;
  email?: string;
  isClientUser: boolean;
  onClientChange: (client: ClientRecord) => void;
  onWorkspacesChange: (workspaces: WorkspaceRecord[]) => void;
  roleCode?: string;
  workspaceError?: string;
  workspaces: readonly WorkspaceRecord[];
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const clientsQuery = useInfiniteClients(agencyId, clientSearch);
  const workspacesQuery = useInfiniteWorkspaces(
    agencyId,
    client?.id ?? 0,
    workspaceSearch,
    email,
    roleCode,
  );
  const clients = uniqueById(
    clientsQuery.data?.pages.flatMap((page) => page.data) ?? [],
  );
  const workspaceOptions = uniqueById(
    workspacesQuery.data?.pages.flatMap((page) => page.data) ?? [],
  );
  const changeClientSearch = useCallback((search: string) => {
    setClientSearch(search);
  }, []);
  const changeWorkspaceSearch = useCallback((search: string) => {
    setWorkspaceSearch(search);
  }, []);

  return (
    <>
      <FormField
        description={
          isClientUser
            ? "Required. Only active clients in the selected agency are available."
            : "Choose an active client to browse optional workspace restrictions. The client is not submitted for this role."
        }
        error={clientError}
        id="invite-client"
        label={isClientUser ? "Client" : "Workspace client"}
        required={isClientUser}
      >
        <PaginatedCombobox
          ariaDescribedBy={
            clientError ? "invite-client-error" : "invite-client-description"
          }
          disabled={!agencyId}
          errorMessage={
            clientsQuery.isError ? "Clients could not be loaded." : undefined
          }
          getKey={(option) => String(option.id)}
          getLabel={(option) => `#${option.id} ${option.name}`}
          hasNextPage={clientsQuery.hasNextPage}
          id="invite-client"
          isFetchingNextPage={clientsQuery.isFetchingNextPage}
          isInvalid={Boolean(clientError)}
          isLoading={clientsQuery.isPending && agencyId > 0}
          loadNextPage={() => void clientsQuery.fetchNextPage()}
          mode="single"
          onChange={onClientChange}
          onRetry={() => void clientsQuery.refetch()}
          onSearchChange={changeClientSearch}
          options={clients}
          placeholder={agencyId ? "Select a client" : "Select an agency first"}
          renderOption={(option) => (
            <span className="flex items-center justify-between gap-3">
              <span className="truncate">
                <span className="font-mono text-xs">#{option.id}</span>{" "}
                {option.name}
              </span>
              <Badge tone="success">Active</Badge>
            </span>
          )}
          searchPlaceholder="Search client name"
          value={client}
        />
      </FormField>

      <FormField
        description={
          isClientUser
            ? "Choose at least one active workspace belonging to this client."
            : "Optional. Selected workspaces restrict this user's access."
        }
        error={workspaceError}
        id="invite-workspaces"
        label="Workspace access"
        required={isClientUser}
      >
        <PaginatedCombobox
          ariaDescribedBy={
            workspaceError
              ? "invite-workspaces-error"
              : "invite-workspaces-description"
          }
          disabled={!client}
          errorMessage={
            workspacesQuery.isError
              ? "Workspaces could not be loaded."
              : undefined
          }
          getKey={(option) => String(option.id)}
          getLabel={(option) => option.name}
          hasNextPage={workspacesQuery.hasNextPage}
          id="invite-workspaces"
          isFetchingNextPage={workspacesQuery.isFetchingNextPage}
          isInvalid={Boolean(workspaceError)}
          isLoading={workspacesQuery.isPending && Boolean(client)}
          isOptionDisabled={(option) =>
            option.invite_status === "added" ||
            option.invite_status === "invited"
          }
          loadNextPage={() => void workspacesQuery.fetchNextPage()}
          mode="multiple"
          onChange={onWorkspacesChange}
          onRetry={() => void workspacesQuery.refetch()}
          onSearchChange={changeWorkspaceSearch}
          options={workspaceOptions}
          placeholder={client ? "Select workspaces" : "Select a client first"}
          renderOption={(option) => {
            const statusLabel =
              option.invite_status === "added"
                ? "Added"
                : option.invite_status === "invited"
                  ? "Invited"
                  : undefined;
            const previouslyInvitedHint =
              !option.invite_status && option.invite_status_reason
                ? `Previously invited (${option.invite_status_reason})`
                : undefined;
            return (
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono text-xs">#{option.id}</span>{" "}
                    {option.name}
                  </span>
                  {statusLabel && <Badge tone="neutral">{statusLabel}</Badge>}
                </span>
                {previouslyInvitedHint && (
                  <span className="text-muted-foreground text-xs">
                    {previouslyInvitedHint}
                  </span>
                )}
              </span>
            );
          }}
          searchPlaceholder="Search workspace name"
          value={workspaces}
        />
        {workspaces.length > 0 && (
          <ul
            aria-label="Selected workspaces"
            className="mt-2 flex flex-wrap gap-2"
          >
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Badge className="gap-1 pr-1" tone="primary">
                  #{workspace.id} {workspace.name}
                  <Button
                    aria-label={`Remove ${workspace.name}`}
                    className="size-6 min-h-6 p-0"
                    onClick={() =>
                      onWorkspacesChange(
                        workspaces.filter((entry) => entry.id !== workspace.id),
                      )
                    }
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden className="size-3" />
                  </Button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </FormField>
    </>
  );
}
