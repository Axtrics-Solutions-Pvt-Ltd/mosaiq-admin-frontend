import { invitationTokenRequestSchema } from "@/features/invitations/contracts";
import { forwardAdminRequest } from "@/lib/api/admin-server";
import { invitationPaths } from "@/lib/api/paths";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = invitationTokenRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid invitation token." },
      { status: 422 },
    );
  return forwardAdminRequest(
    request,
    invitationPaths.inspect,
    "POST",
    parsed.data,
  );
}
