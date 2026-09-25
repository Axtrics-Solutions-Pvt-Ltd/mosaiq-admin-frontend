import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { channelPaths } from "@/lib/api/paths";

export async function GET(request: Request) {
  return forwardAgencyRequest(request, channelPaths.collection, "GET");
}
