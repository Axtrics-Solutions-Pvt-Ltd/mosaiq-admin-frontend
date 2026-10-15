import { forwardAdminFileDownload } from "@/lib/api/admin-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

// A zip for a section or tab, a `.csv` for a widget, passed through as sent.
export async function GET(
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
  return forwardAdminFileDownload(
    request,
    reportPaths.csvTemplate(ids.agency, ids.client, ids.report, ids.item),
  );
}
