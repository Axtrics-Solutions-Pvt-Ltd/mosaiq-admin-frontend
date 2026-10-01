import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

type Params = { agency: string; client: string; report: string; item: string };

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  const ids = await positiveRouteIds(context.params, [
    "agency",
    "client",
    "report",
    "item",
  ]);
  if (!ids) return invalidScope();
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["from", "to", "channel", "search", "page", "per_page"]) {
    const value = incoming.get(key);
    if (value) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    reportPaths.layoutItemCreatives(
      ids.agency,
      ids.client,
      ids.report,
      ids.item,
    ) + (query.size ? "?" + query : ""),
    "GET",
  );
}
