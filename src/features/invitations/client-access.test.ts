import { describe, expect, it } from "vitest";

import {
  describeSelection,
  fromUserAccess,
  isSameSelection,
  selectionFromCreatable,
  toClientsPayload,
} from "./client-access";

describe("client access selection", () => {
  it("turns a selection into the clients payload, dropping empty clients", () => {
    expect(
      toClientsPayload({
        7: { allWorkspaces: false, workspaceIds: [12, 10] },
        4: { allWorkspaces: true, workspaceIds: [] },
        9: { allWorkspaces: false, workspaceIds: [] },
      }),
    ).toEqual([
      { client_id: 4, all_workspaces: true },
      { client_id: 7, all_workspaces: false, workspace_ids: [10, 12] },
    ]);
  });

  it("starts the edit selection from active and pending access", () => {
    expect(
      fromUserAccess([
        {
          client_id: 4,
          client_name: "Acme",
          all_workspaces: true,
          workspace_ids: [1],
          pending_all_workspaces: false,
          pending_workspace_ids: [],
        },
        {
          client_id: 7,
          client_name: "Globex",
          all_workspaces: false,
          workspace_ids: [10],
          pending_all_workspaces: false,
          pending_workspace_ids: [11],
        },
        {
          client_id: 8,
          client_name: "Initech",
          all_workspaces: false,
          workspace_ids: [],
          pending_all_workspaces: true,
          pending_workspace_ids: [],
        },
      ]),
    ).toEqual({
      4: { allWorkspaces: true, workspaceIds: [] },
      7: { allWorkspaces: false, workspaceIds: [10, 11] },
      8: { allWorkspaces: true, workspaceIds: [] },
    });
  });

  it("rebuilds the clients that can still be sent after a conflict", () => {
    expect(
      toClientsPayload(
        selectionFromCreatable([
          { workspace_id: null, client_id: 4 },
          { workspace_id: 10, client_id: 7 },
          { workspace_id: 11, client_id: 7 },
        ]),
      ),
    ).toEqual([
      { client_id: 4, all_workspaces: true },
      { client_id: 7, all_workspaces: false, workspace_ids: [10, 11] },
    ]);
  });

  it("compares selections by what they grant and describes them", () => {
    expect(
      isSameSelection(
        { 4: { allWorkspaces: false, workspaceIds: [2, 1] } },
        { 4: { allWorkspaces: false, workspaceIds: [1, 2] } },
      ),
    ).toBe(true);
    expect(describeSelection({})).toBe("No clients selected");
    expect(
      describeSelection({
        4: { allWorkspaces: true, workspaceIds: [] },
        7: { allWorkspaces: false, workspaceIds: [10, 11] },
      }),
    ).toBe("2 clients · 1 with all workspaces · 2 workspaces");
  });
});
