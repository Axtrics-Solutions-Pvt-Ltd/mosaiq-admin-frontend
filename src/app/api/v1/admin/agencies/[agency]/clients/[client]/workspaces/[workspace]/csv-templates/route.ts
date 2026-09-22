import { forwardAdminRequest } from "@/lib/api/admin-server";
import { csvTemplatePaths } from "@/lib/api/paths";

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
  return forwardAdminRequest(
    request,
    csvTemplatePaths.collection(ids.agencyId, ids.clientId, ids.workspaceId),
    "GET",
  );
}
