import { forwardAdminRequest } from "@/lib/api/admin-server";
import { rolePaths } from "@/lib/api/paths";

export async function GET(request: Request) {
  return forwardAdminRequest(request, rolePaths.collection, "GET");
}
