import { csvImportTypeSchema } from "@/features/data-import/contracts";
import { forwardAdminUpload } from "@/lib/api/admin-server";
import { csvImportPaths } from "@/lib/api/paths";

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

export async function POST(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json(
      { message: "Invalid workspace scope." },
      { status: 400 },
    );
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ message: "Invalid upload." }, { status: 400 });
  }
  const type = formData.get("type");
  const file = formData.get("file");
  if (
    typeof type !== "string" ||
    !csvImportTypeSchema.safeParse(type).success ||
    !(file instanceof File)
  )
    return Response.json(
      { message: "Choose a dataset type and CSV file." },
      { status: 422 },
    );
  return forwardAdminUpload(
    request,
    csvImportPaths.preview(ids.agencyId, ids.clientId, ids.workspaceId),
    formData,
  );
}
