import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { BadRequestError, readJson, withApiHandler } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  password: z.string().min(1, "Enter your password").max(200),
});

/** Naive per-instance throttle: enough to slow down blind guessing. */
const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;
}

export const POST = withApiHandler(async (request: Request) => {
  const hash = process.env.OWNER_PASSWORD_HASH;
  if (!hash) {
    console.error("OWNER_PASSWORD_HASH is not configured.");
    return NextResponse.json(
      { error: "The application is not configured yet. Set OWNER_PASSWORD_HASH." },
      { status: 500 },
    );
  }

  const key = clientKey(request);
  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = loginSchema.safeParse(await readJson(request));
  if (!body.success) {
    throw new BadRequestError("Enter your password");
  }

  const valid = await bcrypt.compare(body.data.password, hash);
  if (!valid) {
    recordFailure(key);
    // Deliberately vague: never reveal whether anything else was wrong.
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  attempts.delete(key);
  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
});
