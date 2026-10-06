import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

const allowedFilters = ["page", "per_page"];

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ agency: string; client: string; workspace: string }> },
) {
  const values = await params;
  const ids = [values.agency, values.client, values.workspace].map(Number);
  if (!ids.every((id) => Number.isSafeInteger(id) && id > 0))
    return Response.json(
      { message: "Invalid channel scope." },
      { status: 400 },
    );
  const [agencyId, clientId, workspaceId] = ids as [number, number, number];
  const incoming = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of allowedFilters) {
    const value = incoming.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const path = workspacePaths.activity(agencyId, clientId, workspaceId);
  return forwardAgencyRequest(
    request,
    `${path}${query.size ? `?${query}` : ""}`,
    "GET",
  );
}
