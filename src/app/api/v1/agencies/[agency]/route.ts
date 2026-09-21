import { agencyProfileSchema } from "@/features/agencies/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { agencyPaths } from "@/lib/api/paths";

function validAgencyId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agency: string }> },
) {
  const id = validAgencyId((await params).agency);
  if (!id)
    return Response.json({ message: "Invalid agency." }, { status: 400 });
  return forwardAgencyRequest(request, agencyPaths.detail(id), "GET");
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agency: string }> },
) {
  const id = validAgencyId((await params).agency);
  if (!id)
    return Response.json({ message: "Invalid agency." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = agencyProfileSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid agency details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    agencyPaths.detail(id),
    "PUT",
    parsed.data,
  );
}
