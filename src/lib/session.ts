import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "./auth";

/** Reads and verifies the owner session from the request cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

/**
 * Server-side guard for pages. Redirects to the login screen when the visitor
 * is not the authenticated owner. Middleware does the same thing earlier, but
 * pages must not rely on it alone.
 */
export async function requirePageSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Server-side guard for API route handlers. Throws `UnauthorizedError`, which
 * `withApiHandler` turns into a 401 response.
 */
export async function requireApiSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
