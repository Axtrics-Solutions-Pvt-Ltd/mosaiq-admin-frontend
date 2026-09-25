import { workspaceProfileSchema } from "@/features/workspaces/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

type Context = {
  params: Promise<{ agency: string; client: string; workspace: string }>;
};
async function scope(context: Context) {
  const values = await context.params;
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  const workspaceId = Number(values.workspace);
  return [agencyId, clientId, workspaceId].every(
    (id) => Number.isSafeInteger(id) && id > 0,
  )
    ? { agencyId, clientId, workspaceId }
    : null;
}
export async function GET(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json(
      { message: "Invalid workspace scope." },
      { status: 400 },
    );
  return forwardAgencyRequest(
    request,
    workspacePaths.detail(ids.agencyId, ids.clientId, ids.workspaceId),
    "GET",
  );
}
export async function PUT(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json(
      { message: "Invalid workspace scope." },
      { status: 400 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = workspaceProfileSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid workspace details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    workspacePaths.detail(ids.agencyId, ids.clientId, ids.workspaceId),
    "PUT",
    parsed.data,
  );
}
export async function DELETE(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json(
      { message: "Invalid workspace scope." },
      { status: 400 },
    );
  return forwardAgencyRequest(
    request,
    workspacePaths.detail(ids.agencyId, ids.clientId, ids.workspaceId),
    "DELETE",
  );
}
