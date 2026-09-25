import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { doseInputSchema } from "@/lib/validation";
import { recordDose } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Records a dose for a treatment: stores the event, deducts stock from the
 * first-expiring package and updates the projections.
 */
export const POST = withApiHandler(async (request: Request, context: Context) => {
  await requireApiSession();
  const { id } = await context.params;

  const raw = request.headers.get("content-length") === "0" ? {} : await readJson(request);
  const input = doseInputSchema.parse(raw ?? {});

  const treatment = await recordDose(id, {
    quantity: input.quantity,
    takenAt: input.takenAt,
    notes: input.notes,
  });

  return NextResponse.json({ treatment }, { status: 201 });
});
