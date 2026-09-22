import { csvImportTypeSchema } from "@/features/data-import/contracts";
import { forwardAdminFileDownload } from "@/lib/api/admin-server";
import { csvTemplatePaths } from "@/lib/api/paths";

type Context = {
  params: Promise<{
    agency: string;
    client: string;
    workspace: string;
    type: string;
    version: string;
  }>;
};

async function scope(context: Context) {
  const values = await context.params;
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  const workspaceId = Number(values.workspace);
  const version = Number(values.version);
  const type = csvImportTypeSchema.safeParse(values.type);
  if (
    ![agencyId, clientId, workspaceId, version].every(
      (id) => Number.isSafeInteger(id) && id > 0,
    ) ||
    !type.success
  )
    return null;
  return { agencyId, clientId, workspaceId, version, type: type.data };
}

export async function GET(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json(
      { message: "Invalid template request." },
      { status: 400 },
    );
  return forwardAdminFileDownload(
    request,
    csvTemplatePaths.download(
      ids.agencyId,
      ids.clientId,
      ids.workspaceId,
      ids.type,
      ids.version,
    ),
  );
}
