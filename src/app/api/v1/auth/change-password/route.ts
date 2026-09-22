import { safeForwardAuthRequest } from "@/lib/api/server";

export async function POST(request: Request) {
  return safeForwardAuthRequest("changePassword", request);
}
