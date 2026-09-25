import { reportCreateRequestSchema } from "@/features/reports/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import {
  invalidBody,
  invalidScope,
  positiveRouteIds,
  readJsonBody,
} from "@/lib/api/route-ids";

type Context = { params: Promise<{ agency: string; client: string }> };
const keys = ["agency", "client"] as const;

export async function GET(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, keys);
  if (!ids) return invalidScope();
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["search", "status", "page", "per_page"]) {
    const value = incoming.get(key);
    if (value !== null) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    reportPaths.collection(ids.agency, ids.client) +
      (query.size ? "?" + query : ""),
    "GET",
  );
}

export async function POST(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, keys);
  if (!ids) return invalidScope();
  const read = await readJsonBody(request);
  if (!read.ok) return invalidBody();
  const parsed = reportCreateRequestSchema.safeParse(read.body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid report details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    reportPaths.collection(ids.agency, ids.client),
    "POST",
    parsed.data,
  );
}
