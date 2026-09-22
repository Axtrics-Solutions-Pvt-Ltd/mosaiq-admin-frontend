import { forwardAdminUpload } from "@/lib/api/admin-server";
import { creativeAssetPaths } from "@/lib/api/paths";

type Context = {
  params: Promise<{
    agency: string;
    client: string;
    workspace: string;
    creativeAsset: string;
  }>;
};

async function scope(context: Context) {
  const values = await context.params;
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  const workspaceId = Number(values.workspace);
  const creativeAssetId = Number(values.creativeAsset);
  return [agencyId, clientId, workspaceId, creativeAssetId].every(
    (id) => Number.isSafeInteger(id) && id > 0,
  )
    ? { agencyId, clientId, workspaceId, creativeAssetId }
    : null;
}

export async function POST(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json(
      { message: "Invalid creative asset." },
      { status: 400 },
    );
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ message: "Invalid upload." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File))
    return Response.json(
      { message: "Choose a file to attach." },
      { status: 422 },
    );
  return forwardAdminUpload(
    request,
    creativeAssetPaths.attachAsset(
      ids.agencyId,
      ids.clientId,
      ids.workspaceId,
      ids.creativeAssetId,
    ),
    formData,
  );
}
