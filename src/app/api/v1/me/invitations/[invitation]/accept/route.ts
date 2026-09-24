import { forwardAdminRequest } from "@/lib/api/admin-server";
import { myInvitationPaths } from "@/lib/api/paths";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitation: string }> },
) {
  const invitationId = Number((await params).invitation);
  if (!Number.isSafeInteger(invitationId) || invitationId <= 0)
    return Response.json({ message: "Invalid invitation." }, { status: 400 });
  return forwardAdminRequest(
    request,
    myInvitationPaths.accept(invitationId),
    "POST",
  );
}
