import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { userPaths } from "@/lib/api/paths";

const allowedFilters = [
  "workspace_id",
  "search",
  "status",
  "role",
  "page",
  "per_page",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agency: string }> },
) {
  const agencyId = Number((await params).agency);
  if (!Number.isSafeInteger(agencyId) || agencyId <= 0)
    return Response.json({ message: "Invalid agency." }, { status: 400 });
  const incoming = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of allowedFilters) {
    const value = incoming.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const path = userPaths.collection(agencyId);
  return forwardAgencyRequest(
    request,
    `${path}${query.size ? `?${query}` : ""}`,
    "GET",
  );
}
