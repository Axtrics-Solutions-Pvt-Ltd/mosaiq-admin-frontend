import { workspaceCredentialsPayloadSchema } from "@/features/workspaces/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

type Context = {
  params: Promise<{ agency: string; client: string; workspace: string }>;
};
async function credentialsPath(context: Context) {
  const values = await context.params;
  const ids = [values.agency, values.client, values.workspace].map(Number);
  if (!ids.every((id) => Number.isSafeInteger(id) && id > 0)) return null;
  const [agencyId, clientId, workspaceId] = ids as [number, number, number];
  return workspacePaths.credentials(agencyId, clientId, workspaceId);
}
const invalidScope = () =>
  Response.json({ message: "Invalid workspace scope." }, { status: 400 });

export async function GET(request: Request, context: Context) {
  const path = await credentialsPath(context);
  if (!path) return invalidScope();
  return forwardAgencyRequest(request, path, "GET");
}
export async function PUT(request: Request, context: Context) {
  const path = await credentialsPath(context);
  if (!path) return invalidScope();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = workspaceCredentialsPayloadSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid credential values." },
      { status: 422 },
    );
  return forwardAgencyRequest(request, path, "PUT", parsed.data);
}
export async function DELETE(request: Request, context: Context) {
  const path = await credentialsPath(context);
  if (!path) return invalidScope();
  return forwardAgencyRequest(request, path, "DELETE");
}
