import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api";
import { requireApiSession } from "@/lib/session";
import { listTransactions } from "@/server/medicines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: Request) => {
  await requireApiSession();
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get("limit"));

  return NextResponse.json({
    transactions: await listTransactions({
      medicineId: params.get("medicineId") ?? undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    }),
  });
});
