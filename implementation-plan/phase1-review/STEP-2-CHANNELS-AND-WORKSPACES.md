# Step 2 — Channels and workspaces

API dependency: API Step 2 (`/channels`, `/admin/channels`, workspace `connector_id`, credentials, fetch, delete, Manager access).

## 2.1 Channel catalogue (Super Admin)

- Route `/channels` (list), plus create/edit in a `Drawer`. Nav item "Channels" in the "Configuration" group, with capability `channels.manage`.
- Feature folder: `src/features/channels/`.
- List columns: name, code, category, active, workspaces using it, position.
- Form fields:
  - name, code (read-only once in use), category, active, position
  - **credential fields editor**: repeatable rows of key, label, type (text/secret/select), required, help, options for select
  - `metric_codes` as a multi-select of base metrics
  - `supports_campaigns` toggle
- Also expose `useChannels()` (from `GET /channels`) for everyone. It's used by the workspace forms and channel badges.

## 2.2 Workspace = channel

**Workspace create (`WorkspaceForm` create mode):**
- Add a required **Channel** select (active channels, with icon/badge) above Name.
- Suggest a name `"{Client} – {Channel}"`; it stays editable.
- The Client picker shows only clients the user can view. For a Manager, that's the API-filtered list.

**Workspace edit:** the channel is shown read-only. Legacy workspaces with no channel show a one-time Channel select.

**Workspace list (`WorkspaceDirectory`):** add a Channel column and a channel filter (`connector_id`).

**Client detail (`ClientDetails`):**
- Show the workspaces as channel cards: channel, name, connection status, last fetched.
- Add a "+ Add channel workspace" action that opens workspace create with the client prefilled.

## 2.3 Connection card (workspace detail)

Replace the old "Workspace data" card in `WorkspaceDetails` with a **Connection** card:

- A form generated from `channel.credential_fields`.
  - Secret fields show `•••• 1234` when set, with a "Replace" button. An empty secret input means keep the stored value.
  - Saving calls `PUT .../credentials`. "Disconnect" calls `DELETE` with a `ConfirmationDialog`.
- A status badge (`not_connected` / `connected` / `error`), `last_fetched_at`, and the last error message.
- A **Fetch data** button (disabled until connected) → `POST .../fetch`. It shows a pending state, then "N rows updated for {from}–{to}".
- A permanent info banner: **"Sample data: live connection to {Channel} comes in a later phase."** It must be visible whenever `is_sample` is true.

## 2.4 Delete workspace

- A "Delete workspace" danger action on the workspace detail. Only visible with `workspaces.delete`.
- `ConfirmationDialog` copy: the workspace is removed from all reports and its access is revoked; the data is kept for recovery. The user must type the workspace name to confirm.
- On success, go to the client detail and invalidate the workspace, client and report queries.

## 2.5 Manager experience

- `capabilitiesForRole("MANAGER")` gets `dashboard.view`, `clients.view`, `workspaces.manage` and `reports.manage`.
- The Clients nav item uses `clients.view`. Create/edit buttons need `clients.manage`.
- Remove any `isAgencyAdmin` shortcuts that assume only admins reach the workspace screens. Rely on the capability plus the API response.

## 2.6 Tests

- Credential form: secrets are never pre-filled; omitting a secret doesn't send the key.
- Workspace create: the channel is required.
- Delete is hidden for a Manager.
- e2e: create a client, add a Meta workspace, save credentials, fetch sample data, and see the status.
