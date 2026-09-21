import { inviteSchema } from "@/features/invitations/contracts";
import { forwardAdminMutation } from "@/lib/api/admin-server";
import { invitationPaths } from "@/lib/api/paths";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agency: string }> },
) {
  const agencyId = Number((await params).agency);
  if (!Number.isSafeInteger(agencyId) || agencyId <= 0)
    return Response.json({ message: "Invalid agency." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid invitation details." },
      { status: 422 },
    );
  return forwardAdminMutation(
    request,
    invitationPaths.collection(agencyId),
    "POST",
    parsed.data,
  );
}
