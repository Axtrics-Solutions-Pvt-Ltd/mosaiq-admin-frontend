export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string | undefined,
    public readonly fieldErrors: Record<string, string>,
    public readonly requestId: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const record = isRecord(body) ? body : {};
  const rawErrors = isRecord(record.errors) ? record.errors : {};
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(rawErrors)) {
    if (Array.isArray(messages) && typeof messages[0] === "string")
      fieldErrors[field] = messages[0];
  }
  const errorCode =
    typeof record.error_code === "string" ? record.error_code : undefined;
  const requestId =
    response.headers.get("X-Request-ID") ??
    (typeof record.request_id === "string" ? record.request_id : undefined);
  const message =
    response.status === 419
      ? "Your session needs refreshing. Please try again."
      : response.status === 429
        ? "Too many attempts. Please wait and try again."
        : response.status >= 500
          ? "The service is unavailable. Please try again."
          : response.status === 401
            ? "We could not verify your account. Please sign in again."
            : response.status === 403
              ? "You do not have access to this area."
              : "The request could not be completed. Please try again.";
  return new ApiError(
    response.status,
    errorCode,
    fieldErrors,
    requestId,
    message,
  );
}

export function unavailableError() {
  return new ApiError(
    0,
    undefined,
    {},
    undefined,
    "The service is unavailable. Please try again.",
  );
}
