import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { batchUpdateSchema } from "@/lib/validation";
import { deleteBatch, updateBatch } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const input = batchUpdateSchema.parse(await readJson(request));
  return NextResponse.json({ batch: await updateBatch(id, input) });
});

export const DELETE = withApiHandler(async (request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const reason = new URL(request.url).searchParams.get("reason");
  await deleteBatch(id, reason);
  return NextResponse.json({ ok: true });
});
