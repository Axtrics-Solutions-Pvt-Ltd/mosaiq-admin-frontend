// Placeholder origin for the separate client-facing MOSAIQ portal.
// Replace once the client portal's actual preview URL contract is confirmed.
const CLIENT_PORTAL_BASE_URL = "https://app.mosaiq.example";

export function clientPreviewUrl(workspaceId: number) {
  return `${CLIENT_PORTAL_BASE_URL}/workspaces/${workspaceId}`;
}
