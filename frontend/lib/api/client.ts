import { ApiError } from "./types";

type Envelope<T> =
  | { success: true; apiVersion: "v1"; requestId: string; message: string; data: T }
  | { success: false; apiVersion: "v1"; message: string; errors?: Record<string, unknown> };

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(base: string, path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// Matches backend/src/common/jwt-auth.guard.ts: auth is carried via httpOnly
// cookies (access_token / refresh_token) set by the backend on login/signup.
// The frontend never reads or stores the token itself - only `credentials:
// "include"` is needed for the cookie to travel with the request.
export async function apiFetch<T>(
  base: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(base, path, options.query);

  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: Envelope<T> | undefined;
  try {
    payload = await response.json();
  } catch {
    // no JSON body (e.g. network failure before headers)
  }

  if (!response.ok || !payload || payload.success === false) {
    const message =
      (payload && "message" in payload && payload.message) ||
      `Request failed with status ${response.status}.`;
    const errors = payload && "errors" in payload ? payload.errors : undefined;
    throw new ApiError(message, response.status, errors);
  }

  return payload.data;
}
