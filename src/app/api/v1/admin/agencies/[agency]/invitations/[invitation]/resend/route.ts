import { forwardAdminRequest } from "@/lib/api/admin-server";
import { invitationPaths } from "@/lib/api/paths";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agency: string; invitation: string }> },
) {
  const { agency, invitation } = await params;
  const agencyId = Number(agency);
  const invitationId = Number(invitation);
  if (
    !Number.isSafeInteger(agencyId) ||
    agencyId <= 0 ||
    !Number.isSafeInteger(invitationId) ||
    invitationId <= 0
  )
    return Response.json({ message: "Invalid invitation." }, { status: 400 });
  return forwardAdminRequest(
    request,
    invitationPaths.resend(agencyId, invitationId),
    "POST",
  );
}
