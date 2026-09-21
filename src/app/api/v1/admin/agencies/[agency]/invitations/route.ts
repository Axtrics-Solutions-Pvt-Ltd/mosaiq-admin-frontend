import { inviteSchema } from "@/features/invitations/contracts";
import { forwardAdminRequest } from "@/lib/api/admin-server";
import { invitationPaths } from "@/lib/api/paths";

const allowedFilters = ["page", "per_page"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agency: string }> },
) {
  const agencyId = Number((await params).agency);
  if (!Number.isSafeInteger(agencyId) || agencyId <= 0)
    return Response.json({ message: "Invalid agency." }, { status: 400 });
  const incoming = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of allowedFilters) {
    const value = incoming.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const path = invitationPaths.collection(agencyId);
  return forwardAdminRequest(
    request,
    `${path}${query.size ? `?${query}` : ""}`,
    "GET",
  );
}

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
  return forwardAdminRequest(
    request,
    invitationPaths.collection(agencyId),
    "POST",
    parsed.data,
  );
}
