import { safeForwardAuthRequest } from "@/lib/api/server";
export async function GET(request: Request) {
  return safeForwardAuthRequest("csrf", request);
}
