import { budgetUpdateRequestSchema } from "@/features/budgets/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { budgetPaths } from "@/lib/api/paths";
import {
  invalidBody,
  positiveRouteIds,
  readJsonBody,
} from "@/lib/api/route-ids";

type Context = { params: Promise<{ agency: string; client: string }> };
const keys = ["agency", "client"] as const;

function invalidClientScope() {
  return Response.json({ message: "Invalid client scope." }, { status: 400 });
}

export async function GET(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, keys);
  if (!ids) return invalidClientScope();
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["month", "workspace_id"]) {
    const value = incoming.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    budgetPaths.collection(ids.agency, ids.client) +
      (query.size ? "?" + query : ""),
    "GET",
  );
}

export async function PUT(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, keys);
  if (!ids) return invalidClientScope();
  const read = await readJsonBody(request);
  if (!read.ok) return invalidBody();
  const parsed = budgetUpdateRequestSchema.safeParse(read.body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid budget details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    budgetPaths.collection(ids.agency, ids.client),
    "PUT",
    parsed.data,
  );
}
