import { forwardAdminRequest } from "@/lib/api/admin-server";
import { importHistoryPaths } from "@/lib/api/paths";

const allowedFilters = [
  "agency_id",
  "client_id",
  "workspace_id",
  "type",
  "status",
  "date_from",
  "date_to",
  "page",
  "per_page",
];

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of allowedFilters) {
    const value = incoming.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardAdminRequest(
    request,
    `${importHistoryPaths.collection}${query.size ? `?${query}` : ""}`,
    "GET",
  );
}
