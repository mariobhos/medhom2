import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "./session";
import { InsufficientInventoryError } from "./inventory";

export class NotFoundError extends Error {
  constructor(what = "Resource") {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export type ApiErrorBody = {
  error: string;
  /** Field-level messages for form validation, keyed by field name. */
  fields?: Record<string, string>;
};

function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Wraps a route handler with a single error-to-response mapping so handlers can
 * throw and stay focused on their happy path.
 */
export function withApiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json<ApiErrorBody>({ error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ZodError) {
        return NextResponse.json<ApiErrorBody>(
          { error: "Please check the highlighted fields", fields: fieldErrors(error) },
          { status: 422 },
        );
      }
      if (error instanceof InsufficientInventoryError) {
        return NextResponse.json<ApiErrorBody>({ error: error.message }, { status: 409 });
      }
      if (error instanceof NotFoundError) {
        return NextResponse.json<ApiErrorBody>({ error: error.message }, { status: 404 });
      }
      if (error instanceof BadRequestError) {
        return NextResponse.json<ApiErrorBody>({ error: error.message }, { status: 400 });
      }

      console.error("Unhandled API error:", error);
      return NextResponse.json<ApiErrorBody>(
        { error: "Something went wrong on the server. Please try again." },
        { status: 500 },
      );
    }
  };
}

/** Parses a JSON request body, rejecting anything that is not an object. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
}
