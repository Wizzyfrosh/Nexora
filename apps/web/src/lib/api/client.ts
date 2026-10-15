// ============================================================
// Nexora Web — Shared API Client
// Base fetch wrapper with credentials, headers, error handling
// ============================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, unknown>;

  constructor(message: string, status: number, errors?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
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

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Attempt to parse JSON body regardless of status
  let body: Record<string, unknown> | null = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. 204 No Content)
  }

  if (!res.ok) {
    const message =
      (body?.message as string) ||
      `Request failed with status ${res.status}`;
    const errors = body?.errors as Record<string, unknown> | undefined;
    throw new ApiError(message, res.status, errors);
  }

  // Standard API response shape: { success, message, data }
  // Return the `data` field if it exists, otherwise the full body
  if (body && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}
