import { reorderRequestSchema } from "@/features/reports/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import {
  invalidBody,
  invalidScope,
  positiveRouteIds,
  readJsonBody,
} from "@/lib/api/route-ids";

export async function PUT(
  request: Request,
  context: {
    params: Promise<{ agency: string; client: string; report: string }>;
  },
) {
  const ids = await positiveRouteIds(context.params, [
    "agency",
    "client",
    "report",
  ]);
  if (!ids) return invalidScope();
  const read = await readJsonBody(request);
  if (!read.ok) return invalidBody();
  const parsed = reorderRequestSchema.safeParse(read.body);
  if (!parsed.success)
    return Response.json({ message: "Invalid layout order." }, { status: 422 });
  return forwardAgencyRequest(
    request,
    reportPaths.layoutOrder(ids.agency, ids.client, ids.report),
    "PUT",
    parsed.data,
  );
}
