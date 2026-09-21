import { updateAgencyUserSchema } from "@/features/users/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { userPaths } from "@/lib/api/paths";

function parseIds(agency: string, user: string) {
  const agencyId = Number(agency);
  const userId = Number(user);
  if (
    !Number.isSafeInteger(agencyId) ||
    agencyId <= 0 ||
    !Number.isSafeInteger(userId) ||
    userId <= 0
  )
    return undefined;
  return { agencyId, userId };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agency: string; user: string }> },
) {
  const { agency, user } = await params;
  const ids = parseIds(agency, user);
  if (!ids) return Response.json({ message: "Invalid user." }, { status: 400 });
  return forwardAgencyRequest(
    request,
    userPaths.detail(ids.agencyId, ids.userId),
    "GET",
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agency: string; user: string }> },
) {
  const { agency, user } = await params;
  const ids = parseIds(agency, user);
  if (!ids) return Response.json({ message: "Invalid user." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = updateAgencyUserSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ message: "Invalid user details." }, { status: 422 });
  return forwardAgencyRequest(
    request,
    userPaths.detail(ids.agencyId, ids.userId),
    "PUT",
    parsed.data,
  );
}
