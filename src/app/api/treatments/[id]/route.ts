import { NextResponse } from "next/server";
import { NotFoundError, readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { treatmentUpdateSchema } from "@/lib/validation";
import { deleteTreatment, getTreatment, updateTreatment } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const treatment = await getTreatment(id);
  if (!treatment) throw new NotFoundError("Treatment");
  return NextResponse.json({ treatment });
});

export const PATCH = withApiHandler(async (request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const input = treatmentUpdateSchema.parse(await readJson(request));
  return NextResponse.json({ treatment: await updateTreatment(id, input) });
});

export const DELETE = withApiHandler(async (_request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  await deleteTreatment(id);
  return NextResponse.json({ ok: true });
});
