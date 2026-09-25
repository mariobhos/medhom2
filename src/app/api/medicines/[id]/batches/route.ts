import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { batchInputSchema } from "@/lib/validation";
import { addBatch } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const input = batchInputSchema.parse(await readJson(request));
  return NextResponse.json({ batch: await addBatch(id, input) }, { status: 201 });
});
