import { shareLinkUpdateRequestSchema } from "@/features/reports/links/contracts";
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
    params: Promise<{
      agency: string;
      client: string;
      report: string;
      link: string;
    }>;
  },
) {
  const ids = await positiveRouteIds(context.params, [
    "agency",
    "client",
    "report",
    "link",
  ]);
  if (!ids) return invalidScope();
  const read = await readJsonBody(request);
  if (!read.ok) return invalidBody();
  const parsed = shareLinkUpdateRequestSchema.safeParse(read.body);
  if (!parsed.success)
    return Response.json({ message: "Invalid link details." }, { status: 422 });
  return forwardAgencyRequest(
    request,
    reportPaths.link(ids.agency, ids.client, ids.report, ids.link),
    "PUT",
    parsed.data,
  );
}
