import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { treatmentInputSchema } from "@/lib/validation";
import { createTreatment, listTreatments } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: Request) => {
  await requireApiSession();
  const activeOnly = new URL(request.url).searchParams.get("active") === "true";
  return NextResponse.json({ treatments: await listTreatments({ activeOnly }) });
});

export const POST = withApiHandler(async (request: Request) => {
  await requireApiSession();
  const input = treatmentInputSchema.parse(await readJson(request));
  return NextResponse.json({ treatment: await createTreatment(input) }, { status: 201 });
});
