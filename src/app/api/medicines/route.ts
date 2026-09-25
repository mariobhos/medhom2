import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { medicineInputSchema } from "@/lib/validation";
import { createMedicine, listMedicines } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: Request) => {
  await requireApiSession();
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  return NextResponse.json({ medicines: await listMedicines(search) });
});

export const POST = withApiHandler(async (request: Request) => {
  await requireApiSession();
  const input = medicineInputSchema.parse(await readJson(request));
  return NextResponse.json({ medicine: await createMedicine(input) }, { status: 201 });
});
