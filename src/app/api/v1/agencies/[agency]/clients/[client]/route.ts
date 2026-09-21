import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agency: string; client: string }> },
) {
  const values = await params;
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  if (![agencyId, clientId].every((id) => Number.isSafeInteger(id) && id > 0))
    return Response.json({ message: "Invalid client scope." }, { status: 400 });
  return forwardAgencyRequest(
    request,
    workspacePaths.client(agencyId, clientId),
    "GET",
  );
}
