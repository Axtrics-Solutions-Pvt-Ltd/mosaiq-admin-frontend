// Reads positive integer ids from a proxy route's dynamic segments. Returns
// null when any is missing or malformed, so the route can answer 400.
export async function positiveRouteIds<Key extends string>(
  params: Promise<Record<NoInfer<Key>, string>>,
  keys: readonly Key[],
): Promise<Record<Key, number> | null> {
  const values = await params;
  const ids = {} as Record<Key, number>;
  for (const key of keys) {
    const id = Number(values[key]);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    ids[key] = id;
  }
  return ids;
}

export function invalidScope() {
  return Response.json({ message: "Invalid report scope." }, { status: 400 });
}

export async function readJsonBody(request: Request) {
  try {
    return { ok: true as const, body: (await request.json()) as unknown };
  } catch {
    return { ok: false as const };
  }
}

export function invalidBody(message = "Invalid request body.") {
  return Response.json({ message }, { status: 400 });
}
