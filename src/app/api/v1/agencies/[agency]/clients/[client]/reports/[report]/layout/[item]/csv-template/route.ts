import { forwardAdminFileDownload } from "@/lib/api/admin-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

// One `.csv` for every scope (combined for a section or tab), passed through
// as sent; `?sample=1` asks for the example rows.
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
  const sample = new URL(request.url).searchParams.get("sample");
  return forwardAdminFileDownload(
    request,
    reportPaths.csvTemplate(ids.agency, ids.client, ids.report, ids.item, {
      sample: sample === "1" || sample === "true",
    }),
  );
}
