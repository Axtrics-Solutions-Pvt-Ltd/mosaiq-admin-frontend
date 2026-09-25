import { reportUpdateRequestSchema } from "@/features/reports/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import {
  invalidBody,
  invalidScope,
  positiveRouteIds,
  readJsonBody,
} from "@/lib/api/route-ids";

type Context = {
  params: Promise<{ agency: string; client: string; report: string }>;
};
const keys = ["agency", "client", "report"] as const;

export async function GET(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, keys);
  if (!ids) return invalidScope();
  return forwardAgencyRequest(
    request,
    reportPaths.detail(ids.agency, ids.client, ids.report),
    "GET",
  );
}

export async function PUT(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, keys);
  if (!ids) return invalidScope();
  const read = await readJsonBody(request);
  if (!read.ok) return invalidBody();
  const parsed = reportUpdateRequestSchema.safeParse(read.body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid report details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    reportPaths.detail(ids.agency, ids.client, ids.report),
    "PUT",
    parsed.data,
  );
}

export async function DELETE(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, keys);
  if (!ids) return invalidScope();
  return forwardAgencyRequest(
    request,
    reportPaths.detail(ids.agency, ids.client, ids.report),
    "DELETE",
  );
}
