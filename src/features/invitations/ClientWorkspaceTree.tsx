"use client";

import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import type {
  ClientRecord,
  WorkspaceRecord,
} from "@/features/workspaces/contracts";
import { useInfiniteClientTree } from "@/features/workspaces/queries";
import { cn } from "@/lib/utils/cn";

import { type ClientAccessSelection, describeSelection } from "./client-access";

/** Access that is invited but not yet accepted, shown with a badge in edit. */
export type PendingClientAccess = {
  allWorkspacesClientIds: ReadonlySet<number>;
  workspaceIds: ReadonlySet<number>;
};

type InviteStatus = "added" | "invited" | null | undefined;

const statusLabels: Record<"added" | "invited", string> = {
  added: "Added",
  invited: "Invited",
};

function uniqueById<Option extends { id: number }>(options: Option[]) {
  return [...new Map(options.map((option) => [option.id, option])).values()];
}

function isTaken(status: InviteStatus) {
  return status === "added" || status === "invited";
}

/**
 * A Manager's access, picked as a client → workspace accordion. Ticking a
 * client gives it "All workspaces" (including workspaces added later) and
 * ticking it again removes it; unticking "All workspaces" keeps the listed
 * workspaces so some can be removed. Clients load 20 at a time as the list
 * scrolls, and search matches client and workspace names. Selected clients
 * that are not in the list (filtered out, not loaded yet, or deactivated) are
 * listed below it so they can still be seen and removed.
 */
export function ClientWorkspaceTree({
  agencyId,
  clientNames,
  disabled = false,
  email,
  error,
  id,
  onChange,
  pending,
  roleCode,
  value,
}: {
  agencyId: number;
  /** Names of already selected clients, e.g. from the user's current access. */
  clientNames?: Readonly<Record<number, string>>;
  disabled?: boolean;
  /** Invitee email: marks clients and workspaces they already have. */
  email?: string;
  error?: string;
  id: string;
  onChange: (selection: ClientAccessSelection) => void;
  pending?: PendingClientAccess;
  roleCode?: string;
  value: ClientAccessSelection;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [toggled, setToggled] = useState<Record<number, boolean>>({});
  // Names of clients ticked in this session, for the "Also selected" list.
  const [pickedNames, setPickedNames] = useState<Record<number, string>>({});
  const query = useInfiniteClientTree(agencyId, search, email, roleCode);
  const clients = uniqueById(
    query.data?.pages.flatMap((page) => page.data) ?? [],
  );
  const listId = useId();
  const isDisabled = disabled || !agencyId;

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  function isExpanded(client: ClientRecord) {
    if (client.id in toggled) return toggled[client.id];
    if (client.id in value) return true;
    // A client listed only because one of its workspaces matched the search.
    return (
      search !== "" &&
      !client.name.toLowerCase().includes(search.toLowerCase()) &&
      (client.workspaces?.length ?? 0) > 0
    );
  }

  function update(
    clientId: number,
    next: ClientAccessSelection[number] | null,
  ) {
    const selection = { ...value };
    const client = clients.find((entry) => entry.id === clientId);
    if (client && next !== null)
      setPickedNames((names) => ({ ...names, [client.id]: client.name }));
    if (next === null) delete selection[clientId];
    else selection[clientId] = next;
    onChange(selection);
  }

  function selectableWorkspaceIds(client: ClientRecord) {
    return (client.workspaces ?? [])
      .filter((workspace) => !isTaken(workspace.invite_status))
      .map((workspace) => workspace.id);
  }

  // Checked (All workspaces) → removed; empty or partly chosen → All workspaces.
  function toggleClient(client: ClientRecord) {
    if (value[client.id]?.allWorkspaces) {
      update(client.id, null);
      return;
    }
    update(client.id, { allWorkspaces: true, workspaceIds: [] });
    setToggled((current) => ({ ...current, [client.id]: true }));
  }

  function toggleAllWorkspaces(client: ClientRecord) {
    const current = value[client.id];
    if (current?.allWorkspaces) {
      const workspaceIds = selectableWorkspaceIds(client);
      update(
        client.id,
        workspaceIds.length ? { allWorkspaces: false, workspaceIds } : null,
      );
      return;
    }
    update(client.id, { allWorkspaces: true, workspaceIds: [] });
  }

  function toggleWorkspace(client: ClientRecord, workspace: WorkspaceRecord) {
    const current = value[client.id];
    const workspaceIds = current?.workspaceIds ?? [];
    const next = workspaceIds.includes(workspace.id)
      ? workspaceIds.filter((workspaceId) => workspaceId !== workspace.id)
      : [...workspaceIds, workspace.id];
    update(
      client.id,
      next.length ? { allWorkspaces: false, workspaceIds: next } : null,
    );
  }

  const listedClientIds = new Set(clients.map((client) => client.id));
  const hiddenSelectedIds =
    agencyId > 0 && query.isSuccess
      ? Object.keys(value)
          .map(Number)
          .filter((clientId) => !listedClientIds.has(clientId))
      : [];

  return (
    <div
      aria-describedby={error ? `${id}-error` : `${id}-description`}
      className={cn("bg-card rounded-lg border", error && "border-destructive")}
      id={id}
      role="group"
    >
      <div className="border-b p-2">
        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            aria-controls={listId}
            aria-label="Search clients and workspaces"
            className="pl-9"
            disabled={isDisabled}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={
              agencyId
                ? "Search clients and workspaces..."
                : "Select an agency first"
            }
            type="search"
            value={searchInput}
          />
        </div>
      </div>

      <div
        aria-busy={query.isPending || query.isFetchingNextPage}
        className="max-h-[28rem] space-y-1.5 overflow-y-auto p-2"
        id={listId}
        onScroll={(event) => {
          const list = event.currentTarget;
          if (
            query.hasNextPage &&
            !query.isFetchingNextPage &&
            list.scrollHeight - list.scrollTop - list.clientHeight < 48
          )
            void query.fetchNextPage();
        }}
      >
        {!agencyId && (
          <p className="text-muted-foreground px-2 py-4 text-sm">
            Select an agency to list its clients.
          </p>
        )}
        {agencyId > 0 && query.isPending && (
          <p className="text-muted-foreground flex items-center gap-2 px-2 py-4 text-sm">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            Loading clients...
          </p>
        )}
        {agencyId > 0 && query.isError && (
          <div className="space-y-2 px-2 py-3 text-sm">
            <p className="text-destructive" role="alert">
              Clients could not be loaded.
            </p>
            <Button
              onClick={() => void query.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              Try again
            </Button>
          </div>
        )}
        {agencyId > 0 && query.isSuccess && clients.length === 0 && (
          <p className="text-muted-foreground px-2 py-4 text-sm">
            {search ? "No clients or workspaces match." : "No active clients."}
          </p>
        )}

        {clients.map((client) => {
          const access = value[client.id];
          const isSelected = Boolean(access);
          const expanded = isExpanded(client);
          const panelId = `${listId}-client-${client.id}`;
          const clientTaken = isTaken(client.invite_status);
          const isPendingAll =
            pending?.allWorkspacesClientIds.has(client.id) ?? false;
          const workspaces = client.workspaces ?? [];

          return (
            <div
              className={cn(
                "rounded-md border",
                isSelected && "border-primary/40 bg-primary-soft/40",
              )}
              key={client.id}
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <Button
                  aria-controls={panelId}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${client.name}`}
                  className="size-7 min-h-7 p-0"
                  onClick={() =>
                    setToggled((current) => ({
                      ...current,
                      [client.id]: !expanded,
                    }))
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {expanded ? (
                    <ChevronDown aria-hidden className="size-4" />
                  ) : (
                    <ChevronRight aria-hidden className="size-4" />
                  )}
                </Button>
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={Boolean(access?.allWorkspaces)}
                    disabled={isDisabled || (clientTaken && !isSelected)}
                    indeterminate={isSelected && !access?.allWorkspaces}
                    onChange={() => toggleClient(client)}
                  />
                  <span className="text-strong truncate text-sm font-medium">
                    {client.name}
                  </span>
                </label>
                {clientTaken && client.invite_status && (
                  <Badge tone="neutral">
                    {statusLabels[client.invite_status]}
                  </Badge>
                )}
                {isPendingAll && <Badge tone="warning">Invite pending</Badge>}
                <span className="text-muted-foreground shrink-0 text-xs">
                  {workspaces.length} workspace
                  {workspaces.length === 1 ? "" : "s"}
                </span>
              </div>

              {expanded && (
                <div className="border-t py-1.5 pr-2 pl-11" id={panelId}>
                  <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
                    <Checkbox
                      checked={Boolean(access?.allWorkspaces)}
                      disabled={isDisabled || (clientTaken && !isSelected)}
                      onChange={() => toggleAllWorkspaces(client)}
                    />
                    <span className="text-sm font-medium">All workspaces</span>
                    <span className="text-muted-foreground text-xs">
                      Includes workspaces added later
                    </span>
                  </label>
                  {workspaces.length === 0 && (
                    <p className="text-muted-foreground py-1.5 pl-7 text-xs">
                      No workspaces yet.
                    </p>
                  )}
                  <ul className="border-l pl-4">
                    {workspaces.map((workspace) => {
                      const taken = isTaken(workspace.invite_status);
                      const isChecked =
                        Boolean(access?.allWorkspaces) ||
                        Boolean(access?.workspaceIds.includes(workspace.id));
                      return (
                        <li key={workspace.id}>
                          <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
                            <Checkbox
                              checked={isChecked}
                              disabled={
                                isDisabled ||
                                Boolean(access?.allWorkspaces) ||
                                (taken && !isChecked)
                              }
                              onChange={() =>
                                toggleWorkspace(client, workspace)
                              }
                            />
                            <span className="truncate text-sm">
                              {workspace.name}
                            </span>
                            {taken && workspace.invite_status && (
                              <Badge tone="neutral">
                                {statusLabels[workspace.invite_status]}
                              </Badge>
                            )}
                            {pending?.workspaceIds.has(workspace.id) && (
                              <Badge tone="warning">Invite pending</Badge>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {query.isFetching && !query.isPending && !query.isFetchingNextPage && (
          <p className="text-muted-foreground flex items-center gap-2 px-2 text-xs">
            <LoaderCircle aria-hidden className="size-3 animate-spin" />
            Updating...
          </p>
        )}
        {query.hasNextPage && !query.isError && (
          <Button
            className="w-full"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {query.isFetchingNextPage ? "Loading more..." : "Load more clients"}
          </Button>
        )}
      </div>

      {hiddenSelectedIds.length > 0 && (
        <div className="border-t px-3 py-2">
          <p className="text-muted-foreground text-xs">
            Also selected (not shown in the list above):
          </p>
          <ul
            aria-label="Other selected clients"
            className="mt-1.5 flex flex-wrap gap-2"
          >
            {hiddenSelectedIds.map((clientId) => {
              const name =
                clientNames?.[clientId] ??
                pickedNames[clientId] ??
                `Client #${clientId}`;
              const access = value[clientId];
              return (
                <li key={clientId}>
                  <Badge className="gap-1 pr-1" tone="primary">
                    {name} ·{" "}
                    {access?.allWorkspaces
                      ? "All workspaces"
                      : `${access?.workspaceIds.length ?? 0} workspace${
                          access?.workspaceIds.length === 1 ? "" : "s"
                        }`}
                    <Button
                      aria-label={`Remove ${name}`}
                      className="size-6 min-h-6 p-0"
                      disabled={isDisabled}
                      onClick={() => update(clientId, null)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <X aria-hidden className="size-3" />
                    </Button>
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p
        aria-live="polite"
        className="text-muted-foreground border-t px-3 py-2 text-xs"
      >
        {describeSelection(value)}
      </p>
    </div>
  );
}
