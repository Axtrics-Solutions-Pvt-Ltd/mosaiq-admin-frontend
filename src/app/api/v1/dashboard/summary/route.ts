import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { dashboardPaths } from "@/lib/api/paths";

export async function GET(request: Request) {
  return forwardAgencyRequest(request, dashboardPaths.summary, "GET");
}
