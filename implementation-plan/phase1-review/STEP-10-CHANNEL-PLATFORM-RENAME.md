# Step 10 — Workspace → Channel, Channel → Platform

Status: built, 6 October 2026. The API side is `mosaiq-laravel-api/docs/phase1-review/STEP-10-CHANNEL-PLATFORM-RENAME.md`.

## Names

| Old label | New label | Code, routes and API fields (unchanged) |
|---|---|---|
| Workspace | **Channel** | `features/workspaces`, `/workspaces`, `workspace_id`, `workspaces.manage` |
| Channel | **Platform** | `features/channels`, `/channels`, `connector_id`, `channels.manage` |

Only user-visible copy changes: navigation, titles, labels, table headers, empty states, toasts, validation messages and `aria-label`s. URLs, query keys, capability names, types and API fields stay as they are.

## Report builder

- The API sends report data per channel (workspace). `meta.channels` lists one entry per source workspace: `code` is the workspace id as a string, plus `name` and `platform`.
- The preview filter, "Edit numbers for" picker and donut click-to-filter keep working without logic changes, because the `{code, name}` shape is the same. Their copy keeps the word "channel", which now means the workspace.
- `channel_list` and donut items carry an optional `platform` code.
- The correction dialog names the channel (workspace) and shows its platform: `Correct Spend — {channel} ({platform})`.
- `ReportResource.workspaces[].channel` is the connector, so it is shown as **Platform** (report list, source rows, budgets).

## Tests

- Unit and e2e assertions on the renamed copy are updated.
- The e2e mock API sends per-workspace `channels` and donut keys.
- Three unit tests were already failing before this step and are unrelated:
  - `clients/api.test.ts` (2 tests)
  - `InvitationDirectory.test.tsx`, "filters invitations by …"
