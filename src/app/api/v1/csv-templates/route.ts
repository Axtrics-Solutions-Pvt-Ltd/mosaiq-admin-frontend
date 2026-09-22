import { forwardAdminRequest } from "@/lib/api/admin-server";
import { csvTemplatePaths } from "@/lib/api/paths";

export async function GET(request: Request) {
  return forwardAdminRequest(request, csvTemplatePaths.allCollection, "GET");
}
