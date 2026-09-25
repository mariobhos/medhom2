import { NextResponse } from "next/server";
import { NotFoundError, readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { medicineInputSchema } from "@/lib/validation";
import { deleteMedicine, getMedicine, updateMedicine } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const medicine = await getMedicine(id);
  if (!medicine) throw new NotFoundError("Medicine");
  return NextResponse.json({ medicine });
});

export const PATCH = withApiHandler(async (request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const input = medicineInputSchema.parse(await readJson(request));
  return NextResponse.json({ medicine: await updateMedicine(id, input) });
});

export const DELETE = withApiHandler(async (_request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  await deleteMedicine(id);
  return NextResponse.json({ ok: true });
});
