import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import { invalidScope, positiveRouteIds } from "@/lib/api/route-ids";

type Params = { agency: string; client: string; report: string; tab: string };

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  const [ids, { tab }] = await Promise.all([
    positiveRouteIds(context.params, ["agency", "client", "report"]),
    context.params,
  ]);
  // Tab codes are catalogue codes such as `executive_summary`.
  if (!ids || !/^[a-z][a-z0-9_]{0,59}$/.test(tab)) return invalidScope();
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["from", "to", "channel"]) {
    const value = incoming.get(key);
    if (value) query.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    reportPaths.previewTab(ids.agency, ids.client, ids.report, tab) +
      (query.size ? "?" + query : ""),
    "GET",
  );
}
