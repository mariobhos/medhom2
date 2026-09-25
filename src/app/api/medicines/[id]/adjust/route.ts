import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { adjustmentSchema } from "@/lib/validation";
import { adjustInventory } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Manual inventory change (restock, discard, correction) on one package. */
export const POST = withApiHandler(async (request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;
  const input = adjustmentSchema.parse(await readJson(request));

  await adjustInventory({
    medicineId: id,
    batchId: input.batchId ?? null,
    type: input.type,
    quantityDelta: input.quantityDelta,
    reason: input.reason ?? null,
  });

  return NextResponse.json({ ok: true });
});
