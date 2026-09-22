import { updateWorkspaceCurationRequestSchema } from "@/features/curation/contracts";
import { forwardAdminRequest } from "@/lib/api/admin-server";
import { curationPaths } from "@/lib/api/paths";

function validWorkspaceId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const id = validWorkspaceId((await params).workspace);
  if (!id)
    return Response.json({ message: "Invalid workspace." }, { status: 400 });
  return forwardAdminRequest(request, curationPaths.detail(id), "GET");
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const id = validWorkspaceId((await params).workspace);
  if (!id)
    return Response.json({ message: "Invalid workspace." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = updateWorkspaceCurationRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid curation configuration." },
      { status: 422 },
    );
  return forwardAdminRequest(
    request,
    curationPaths.detail(id),
    "PUT",
    parsed.data,
  );
}
