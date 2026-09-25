import { reportWorkspacesRequestSchema } from "@/features/reports/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { reportPaths } from "@/lib/api/paths";
import {
  invalidBody,
  invalidScope,
  positiveRouteIds,
  readJsonBody,
} from "@/lib/api/route-ids";

type Context = {
  params: Promise<{ agency: string; client: string; report: string }>;
};

export async function PUT(request: Request, context: Context) {
  const ids = await positiveRouteIds(context.params, [
    "agency",
    "client",
    "report",
  ]);
  if (!ids) return invalidScope();
  const read = await readJsonBody(request);
  if (!read.ok) return invalidBody();
  const parsed = reportWorkspacesRequestSchema.safeParse(read.body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid source workspaces." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    reportPaths.workspaces(ids.agency, ids.client, ids.report),
    "PUT",
    parsed.data,
  );
}
