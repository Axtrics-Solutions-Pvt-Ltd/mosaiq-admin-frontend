import { agencyCreateSchema } from "@/features/agencies/contracts";
import { forwardAgencyRequest } from "@/lib/api/agency-server";
import { agencyPaths } from "@/lib/api/paths";

const allowedFilters = [
  "search",
  "status",
  "currency",
  "workspace_count",
  "activity",
  "page",
  "per_page",
];

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const params = new URLSearchParams();
  for (const key of allowedFilters) {
    const value = incoming.searchParams.get(key);
    if (value !== null) params.set(key, value);
  }
  return forwardAgencyRequest(
    request,
    `${agencyPaths.collection}${params.size ? `?${params}` : ""}`,
    "GET",
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
  const parsed = agencyCreateSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Invalid agency details." },
      { status: 422 },
    );
  return forwardAgencyRequest(
    request,
    agencyPaths.collection,
    "POST",
    parsed.data,
  );
}
