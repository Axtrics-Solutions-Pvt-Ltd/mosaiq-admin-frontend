import { layoutItemPatchSchema } from "@/features/reports/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import {
  invalidBody,
  invalidScope,
  positiveRouteIds,
  readJsonBody,
} from "@/lib/api/route-ids";

export async function PATCH(
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
  const read = await readJsonBody(request);
  if (!read.ok) return invalidBody();
  const parsed = layoutItemPatchSchema.safeParse(read.body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid layout change." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    reportPaths.layoutItem(ids.agency, ids.client, ids.report, ids.item),
    "PATCH",
    parsed.data,
  );
}
