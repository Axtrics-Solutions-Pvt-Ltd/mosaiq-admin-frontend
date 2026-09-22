import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { userPaths } from "@/lib/api/paths";

const allowedFilters = [
  "agency_id",
  "workspace_id",
  "search",
  "status",
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
  return forwardAgencyRequest(
    request,
    `${userPaths.allCollection}${query.size ? `?${query}` : ""}`,
    "GET",
  );
}
