import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agency: string }> },
) {
  const agencyId = Number((await params).agency);
  if (!Number.isSafeInteger(agencyId) || agencyId <= 0)
    return Response.json({ message: "Invalid agency." }, { status: 400 });
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["search", "status", "page", "per_page"]) {
    const value = incoming.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    workspacePaths.clients(agencyId) + (query.size ? "?" + query : ""),
    "GET",
  );
}
