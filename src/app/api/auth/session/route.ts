import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the client whether the current cookie is a valid owner session. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ authenticated: await isAuthenticated() });
}
