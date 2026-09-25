import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { correctionPaths } from "@/lib/api/paths";

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ agency: string; client: string; correction: string }>;
  },
) {
  const values = await params;
  const ids = [values.agency, values.client, values.correction].map(Number);
  if (!ids.every((id) => Number.isSafeInteger(id) && id > 0))
    return Response.json(
      { message: "Invalid correction scope." },
      { status: 400 },
    );
  const [agencyId, clientId, correctionId] = ids as [number, number, number];
  return forwardAgencyRequest(
    request,
    correctionPaths.detail(agencyId, clientId, correctionId),
    "DELETE",
  );
}
