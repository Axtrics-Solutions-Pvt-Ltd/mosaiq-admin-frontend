import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      agency: string;
      client: string;
      report: string;
      item: string;
    }>;
  },
) {
  const ids = await positiveRouteIds(context.params, [
    "agency",
    "client",
    "report",
    "item",
  ]);
  if (!ids) return invalidScope();
  return forwardAgencyRequest(
    request,
    reportPaths.layoutItemReset(ids.agency, ids.client, ids.report, ids.item),
    "POST",
  );
}
