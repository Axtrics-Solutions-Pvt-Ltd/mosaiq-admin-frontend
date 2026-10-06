import { z } from "zod";

/**
 * A Manager's access to one client: "All workspaces" (every workspace,
 * including ones added later) or a chosen set of that client's workspaces.
 */
export type ClientAccess = { allWorkspaces: boolean; workspaceIds: number[] };

/** Selected access keyed by client id. A client is selected when it has a key. */
export type ClientAccessSelection = Record<number, ClientAccess>;

const positiveId = z.number().int().positive();

export const clientAccessPayloadSchema = z
  .object({
    client_id: positiveId,
    all_workspaces: z.boolean(),
    workspace_ids: z.array(positiveId).optional(),
  })
  .superRefine((value, context) => {
    const workspaceIds = value.workspace_ids ?? [];
    if (!value.all_workspaces && workspaceIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["workspace_ids"],
        message: "Choose at least one channel or All channels.",
      });
    }
    if (new Set(workspaceIds).size !== workspaceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["workspace_ids"],
        message: "Choose each channel only once.",
      });
    }
  });
export type ClientAccessPayload = z.infer<typeof clientAccessPayloadSchema>;

/** Adds an issue when the same client appears twice in a `clients` list. */
export function checkDistinctClients(
  clients: readonly ClientAccessPayload[] | undefined,
  context: z.RefinementCtx,
) {
  const clientIds = (clients ?? []).map((entry) => entry.client_id);
  if (new Set(clientIds).size !== clientIds.length) {
    context.addIssue({
      code: "custom",
      path: ["clients"],
      message: "Choose each client only once.",
    });
  }
}

/** What a user holds per client, as returned by the users API. */
export const userClientAccessSchema = z.object({
  client_id: positiveId,
  client_name: z.string().nullable(),
  all_workspaces: z.boolean(),
  workspace_ids: z.array(positiveId),
  pending_all_workspaces: z.boolean(),
  pending_workspace_ids: z.array(positiveId),
});
export type UserClientAccess = z.infer<typeof userClientAccessSchema>;

export function toClientsPayload(
  selection: ClientAccessSelection,
): ClientAccessPayload[] {
  return Object.entries(selection)
    .filter(
      ([, access]) => access.allWorkspaces || access.workspaceIds.length > 0,
    )
    .map(([clientId, access]) =>
      access.allWorkspaces
        ? { client_id: Number(clientId), all_workspaces: true }
        : {
            client_id: Number(clientId),
            all_workspaces: false,
            workspace_ids: [...access.workspaceIds].sort((a, b) => a - b),
          },
    )
    .sort((a, b) => a.client_id - b.client_id);
}

/**
 * The edit form's starting selection: everything the user holds or has been
 * invited to, so saving without changes keeps pending invitations.
 */
export function fromUserAccess(
  access: readonly UserClientAccess[],
): ClientAccessSelection {
  const selection: ClientAccessSelection = {};
  for (const entry of access) {
    const allWorkspaces = entry.all_workspaces || entry.pending_all_workspaces;
    const workspaceIds = allWorkspaces
      ? []
      : [...new Set([...entry.workspace_ids, ...entry.pending_workspace_ids])];
    if (allWorkspaces || workspaceIds.length > 0) {
      selection[entry.client_id] = { allWorkspaces, workspaceIds };
    }
  }
  return selection;
}

/**
 * Rebuilds a selection from the targets an invitation conflict says can still
 * be sent: a row without a workspace means "All workspaces" of its client.
 */
export function selectionFromCreatable(
  creatable: readonly {
    workspace_id: number | null;
    client_id?: number | null;
  }[],
): ClientAccessSelection {
  const selection: ClientAccessSelection = {};
  for (const target of creatable) {
    if (!target.client_id) continue;
    const current = selection[target.client_id] ?? {
      allWorkspaces: false,
      workspaceIds: [],
    };
    selection[target.client_id] =
      target.workspace_id === null
        ? { allWorkspaces: true, workspaceIds: [] }
        : {
            ...current,
            workspaceIds: [...current.workspaceIds, target.workspace_id],
          };
  }
  return selection;
}

export function isSameSelection(
  first: ClientAccessSelection,
  second: ClientAccessSelection,
) {
  return (
    JSON.stringify(toClientsPayload(first)) ===
    JSON.stringify(toClientsPayload(second))
  );
}

/** "2 clients · 1 with all workspaces · 3 workspaces" */
export function describeSelection(selection: ClientAccessSelection) {
  const entries = Object.values(selection);
  if (entries.length === 0) return "No clients selected";
  const allCount = entries.filter((entry) => entry.allWorkspaces).length;
  const workspaceCount = entries.reduce(
    (total, entry) =>
      total + (entry.allWorkspaces ? 0 : entry.workspaceIds.length),
    0,
  );
  const parts = [`${entries.length} client${entries.length === 1 ? "" : "s"}`];
  if (allCount > 0) parts.push(`${allCount} with all channels`);
  if (workspaceCount > 0)
    parts.push(`${workspaceCount} channel${workspaceCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
