// ============================================================
// Nexora Web — Shared API Client
// Base fetch wrapper with credentials, headers, error handling
// ============================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
let refreshing: Promise<boolean> | null = null;
async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    const request = async () => {
      try {
        return (
          await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        ).ok;
      } catch {
        return false;
      }
    };
    // Single-flight per tab, plus cross-tab serialization where Web Locks is supported.
    refreshing = (async () =>
      await (typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request("nexora-session-refresh", request)
        : request()))().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Shared fetch wrapper for all API calls.
 * - Includes credentials (HTTP-only cookies) on every request
 * - Sets JSON content-type headers
 * - Parses errors from the standard API response format
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const request = () =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  let res = await request();
  if (
    res.status === 401 &&
    (endpoint === "/auth/me" || !endpoint.startsWith("/auth/")) &&
    (await refreshSession())
  ) {
    res = await request(); // Exactly one retry; no refresh loops or retries after business writes.
  }

  // Attempt to parse JSON body regardless of status
  let body: Record<string, unknown> | null = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. 204 No Content)
  }

  if (!res.ok) {
    const message =
      (body?.message as string) || `Request failed with status ${res.status}`;
    const errors = body?.errors as Record<string, unknown> | undefined;
    throw new ApiError(message, res.status, errors);
  }

  // Standard API response shape: { success, message, data }
  // Return the `data` field if it exists, otherwise the full body
  if (body && "data" in body) {
    return body.data as T;
  }

  return body as T;
}
