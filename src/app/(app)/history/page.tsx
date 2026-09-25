import Link from "next/link";
import { listTransactions } from "@/server/medicines";
import { Card, EmptyState, Pill } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { TRANSACTION_LABELS } from "@/lib/validation";
import type { TransactionType } from "@/db/schema";

export const dynamic = "force-dynamic";

const TONES: Record<TransactionType, "brand" | "danger" | "warn" | "info" | "neutral"> = {
  dose_consumed: "info",
  purchase_added: "brand",
  discarded: "danger",
  manual_correction: "warn",
  package_added: "brand",
  package_removed: "danger",
};

export default async function HistoryPage() {
  const transactions = await listTransactions({ limit: 200 });

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">History</h1>
        <p className="mt-1 text-sm text-muted">
          Every inventory change, newest first. Nothing is overwritten silently.
        </p>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="No changes yet"
          description="Doses, restocks, corrections and removals will appear here."
        />
      ) : (
        <Card className="divide-y divide-line">
          {transactions.map((transaction) => (
            <Link
              key={transaction.id}
              href={`/medicines/${transaction.medicineId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-canvas"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {transaction.medicineName}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <Pill tone={TONES[transaction.type] ?? "neutral"}>
                    {TRANSACTION_LABELS[transaction.type] ?? transaction.type}
                  </Pill>
                  {formatDateTime(transaction.createdAt)}
                </p>
                {transaction.reason && (
                  <p className="mt-0.5 truncate text-xs text-muted italic">{transaction.reason}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`text-sm font-bold ${
                    transaction.quantityDelta < 0 ? "text-danger-600" : "text-brand-700"
                  }`}
                >
                  {transaction.quantityDelta > 0 ? "+" : ""}
                  {transaction.quantityDelta} {transaction.unit}
                </p>
                {transaction.quantityAfter !== null && (
                  <p className="text-xs text-muted">→ {transaction.quantityAfter}</p>
                )}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
