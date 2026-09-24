import { forwardAdminRequest } from "@/lib/api/admin-server";
import { myInvitationPaths } from "@/lib/api/paths";

export async function GET(request: Request) {
  return forwardAdminRequest(request, myInvitationPaths.collection, "GET");
}
