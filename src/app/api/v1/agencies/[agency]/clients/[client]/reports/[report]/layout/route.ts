import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

export async function GET(
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
  return forwardAgencyRequest(
    request,
    reportPaths.layout(ids.agency, ids.client, ids.report),
    "GET",
  );
}
