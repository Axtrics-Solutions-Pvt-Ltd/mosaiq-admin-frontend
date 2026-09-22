import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

const allowedFilters = ["agency_id", "search", "status", "page", "per_page"];

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of allowedFilters) {
    const value = incoming.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    `${workspacePaths.allCollection}${query.size ? `?${query}` : ""}`,
    "GET",
  );
}
