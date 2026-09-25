import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "medhome_session";

const DEFAULT_TTL_DAYS = 30;

function sessionTtlDays(): number {
  const raw = Number(process.env.SESSION_TTL_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_DAYS;
}

export function sessionMaxAgeSeconds(): number {
  return Math.floor(sessionTtlDays() * 24 * 60 * 60);
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a random value of at least 32 characters.",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: "owner";
  iat: number;
  exp: number;
};

/** Issues a signed session token for the single owner. */
export async function createSessionToken(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + sessionMaxAgeSeconds())
    .setAudience("medhome")
    .setIssuer("medhome")
    .sign(secretKey());
}

/**
 * Verifies a session token. Returns `null` for anything invalid, expired or
 * tampered with. Safe to call from the Edge middleware and from route handlers.
 */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      audience: "medhome",
      issuer: "medhome",
      algorithms: ["HS256"],
    });
    if (payload.sub !== "owner") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Cookie attributes shared by login and logout so they always match. */
export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  };
}
