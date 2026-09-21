import { workspaceProfileSchema } from "@/features/workspaces/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { workspacePaths } from "@/lib/api/paths";

type Context = { params: Promise<{ agency: string; client: string }> };
async function scope(context: Context) {
  const values = await context.params;
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  return Number.isSafeInteger(agencyId) &&
    agencyId > 0 &&
    Number.isSafeInteger(clientId) &&
    clientId > 0
    ? { agencyId, clientId }
    : null;
}
export async function GET(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json(
      { message: "Invalid workspace scope." },
      { status: 400 },
    );
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["search", "status", "page", "per_page"]) {
    const value = incoming.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    workspacePaths.collection(ids.agencyId, ids.clientId) +
      (query.size ? "?" + query : ""),
    "GET",
  );
}
export async function POST(request: Request, context: Context) {
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
    workspacePaths.collection(ids.agencyId, ids.clientId),
    "POST",
    parsed.data,
  );
}
