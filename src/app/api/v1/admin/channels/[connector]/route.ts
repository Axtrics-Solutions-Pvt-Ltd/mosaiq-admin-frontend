import { channelRequestSchema } from "@/features/channels/contracts";
import { forwardAdminRequest } from "@/lib/api/admin-server";
import { channelPaths } from "@/lib/api/paths";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ connector: string }> },
) {
  const channelId = Number((await params).connector);
  if (!Number.isSafeInteger(channelId) || channelId <= 0)
    return Response.json({ message: "Invalid channel." }, { status: 400 });
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
    channelPaths.adminDetail(channelId),
    "PUT",
    parsed.data,
  );
}
