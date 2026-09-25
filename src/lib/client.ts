export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

/** Thin fetch wrapper that turns API error bodies into `ApiError`. */
export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Network problem. Check your connection and try again.", 0);
  }

  if (response.status === 401) {
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string; fields?: Record<string, string> })
    | null;

  if (!response.ok) {
    throw new ApiError(
      body?.error ?? "Something went wrong. Please try again.",
      response.status,
      body?.fields ?? {},
    );
  }

  return body as T;
}

/** Parses a user-entered quantity, tolerating comma decimal separators. */
export function parseQuantity(value: string): number | null {
  const normalised = value.trim().replace(",", ".");
  if (normalised === "") return null;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}
