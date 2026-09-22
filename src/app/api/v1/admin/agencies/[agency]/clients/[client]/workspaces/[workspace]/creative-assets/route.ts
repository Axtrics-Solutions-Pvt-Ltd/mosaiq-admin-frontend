import { forwardAdminRequest } from "@/lib/api/admin-server";
import { creativeAssetPaths } from "@/lib/api/paths";

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
  const csvImportId = Number(
    new URL(request.url).searchParams.get("csv_import_id"),
  );
  if (!Number.isSafeInteger(csvImportId) || csvImportId <= 0)
    return Response.json(
      { message: "A csv_import_id is required." },
      { status: 400 },
    );
  const path = `${creativeAssetPaths.collection(
    ids.agencyId,
    ids.clientId,
    ids.workspaceId,
  )}?csv_import_id=${csvImportId}`;
  return forwardAdminRequest(request, path, "GET");
}
