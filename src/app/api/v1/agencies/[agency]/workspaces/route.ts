import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

const allowedFilters = ["search", "status", "page", "per_page"];
const allowedArrayFilters = ["ids"];

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
  for (const key of allowedArrayFilters) {
    for (const value of incoming.searchParams.getAll(`${key}[]`)) {
      query.append(`${key}[]`, value);
    }
  }
  const path = workspacePaths.agencyCollection(agencyId);
  return forwardAgencyRequest(
    request,
    `${path}${query.size ? `?${query}` : ""}`,
    "GET",
  );
}
