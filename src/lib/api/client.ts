import { toApiError, unavailableError } from "./errors";

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        ...(options.body === undefined || isFormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });
  } catch {
    throw unavailableError();
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  try {
    const body = await response.text();
    return body ? (JSON.parse(body) as T) : (undefined as T);
  } catch {
    throw unavailableError();
  }
}
