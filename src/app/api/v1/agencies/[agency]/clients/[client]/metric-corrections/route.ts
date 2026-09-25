import { correctionRequestSchema } from "@/features/corrections/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { correctionPaths } from "@/lib/api/paths";

type Context = { params: Promise<{ agency: string; client: string }> };
async function scope(context: Context) {
  const values = await context.params;
  const agencyId = Number(values.agency);
  const clientId = Number(values.client);
  return [agencyId, clientId].every((id) => Number.isSafeInteger(id) && id > 0)
    ? { agencyId, clientId }
    : null;
}
export async function GET(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json({ message: "Invalid client scope." }, { status: 400 });
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of [
    "workspace_id",
    "metric_code",
    "active",
    "page",
    "per_page",
  ]) {
    const value = incoming.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    correctionPaths.collection(ids.agencyId, ids.clientId) +
      (query.size ? "?" + query : ""),
    "GET",
  );
}
export async function POST(request: Request, context: Context) {
  const ids = await scope(context);
  if (!ids)
    return Response.json({ message: "Invalid client scope." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = correctionRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid correction details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    correctionPaths.collection(ids.agencyId, ids.clientId),
    "POST",
    parsed.data,
  );
}
