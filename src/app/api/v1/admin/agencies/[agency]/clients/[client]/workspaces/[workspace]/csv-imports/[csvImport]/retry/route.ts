import { forwardAdminRequest } from "@/lib/api/admin-server";
import { csvImportPaths } from "@/lib/api/paths";

type Context = {
  params: Promise<{
    agency: string;
    client: string;
    workspace: string;
    csvImport: string;
  }>;
};

async function scope(context: Context) {
  const values = await context.params;
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  const workspaceId = Number(values.workspace);
  const csvImportId = Number(values.csvImport);
  return [agencyId, clientId, workspaceId, csvImportId].every(
    (id) => Number.isSafeInteger(id) && id > 0,
  )
    ? { agencyId, clientId, workspaceId, csvImportId }
    : null;
}

export async function POST(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json({ message: "Invalid CSV import." }, { status: 400 });
  return forwardAdminRequest(
    request,
    csvImportPaths.retry(
      ids.agencyId,
      ids.clientId,
      ids.workspaceId,
      ids.csvImportId,
    ),
    "POST",
  );
}
