import { channelRequestSchema } from "@/features/channels/contracts";
import { forwardAdminRequest } from "@/lib/api/admin-server";
import { channelPaths } from "@/lib/api/paths";

export async function GET(request: Request) {
  return forwardAdminRequest(request, channelPaths.adminCollection, "GET");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = channelRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid channel details." },
      { status: 422 },
    );
  return forwardAdminRequest(
    request,
    channelPaths.adminCollection,
    "POST",
    parsed.data,
  );
}
