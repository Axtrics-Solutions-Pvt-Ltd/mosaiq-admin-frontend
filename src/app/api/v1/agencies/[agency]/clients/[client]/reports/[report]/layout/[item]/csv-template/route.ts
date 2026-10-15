import { forwardAdminFileDownload } from "@/lib/api/admin-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

// The template, passed through as sent: a combined `.csv` for a section or
// tab, or a `.zip` of card CSVs with `?format=zip`; a widget's own `.csv`.
// `?sample=1` asks for the example rows. Other parameters are dropped.
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
  const query = new URL(request.url).searchParams;
  const sample = query.get("sample");
  return forwardAdminFileDownload(
    request,
    reportPaths.csvTemplate(ids.agency, ids.client, ids.report, ids.item, {
      sample: sample === "1" || sample === "true",
      format: query.get("format") === "zip" ? "zip" : "csv",
    }),
  );
}
