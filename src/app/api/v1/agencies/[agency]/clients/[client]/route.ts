import { clientProfileSchema } from "@/features/clients/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

function scope(values: { agency: string; client: string }) {
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  return [agencyId, clientId].every((id) => Number.isSafeInteger(id) && id > 0)
    ? { agencyId, clientId }
    : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agency: string; client: string }> },
) {
  const ids = scope(await params);
  if (!ids)
    return Response.json({ message: "Invalid client scope." }, { status: 400 });
  return forwardAgencyRequest(
    request,
    workspacePaths.client(ids.agencyId, ids.clientId),
    "GET",
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agency: string; client: string }> },
) {
  const ids = scope(await params);
  if (!ids)
    return Response.json({ message: "Invalid client scope." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = clientProfileSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid client details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    workspacePaths.client(ids.agencyId, ids.clientId),
    "PUT",
    parsed.data,
  );
}
