import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ agency: string; client: string; workspace: string }> },
) {
  const values = await params;
  const ids = [values.agency, values.client, values.workspace].map(Number);
  if (!ids.every((id) => Number.isSafeInteger(id) && id > 0))
    return Response.json(
      { message: "Invalid workspace scope." },
      { status: 400 },
    );
  const [agencyId, clientId, workspaceId] = ids as [number, number, number];
  return forwardAgencyRequest(
    request,
    workspacePaths.fetch(agencyId, clientId, workspaceId),
    "POST",
  );
}
