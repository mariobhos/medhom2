import Link from "next/link";
import { notFound } from "next/navigation";
import { getMedicine, listTransactions, listTreatments } from "@/server/medicines";
import { MedicineDetail } from "@/components/MedicineDetail";
import { TreatmentCard } from "@/components/TreatmentCard";
import { Card, SectionHeading } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { TRANSACTION_LABELS } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function MedicinePage({ params }: Props) {
  const { id } = await params;
  const medicine = await getMedicine(id);
  if (!medicine) notFound();

  const [treatments, transactions] = await Promise.all([
    listTreatments(),
    listTransactions({ medicineId: id, limit: 25 }),
  ]);

  const medicineTreatments = treatments.filter(
    (treatment) => treatment.medicineId === id && treatment.active,
  );

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <Link href="/medicines" className="-mb-2 w-fit text-sm font-semibold text-muted">
        ← Medicines
      </Link>

      <MedicineDetail medicine={medicine} hasActiveTreatment={medicineTreatments.length > 0} />

      {medicineTreatments.length > 0 && (
        <section>
          <SectionHeading title="Active treatments" count={medicineTreatments.length} />
          <div className="grid gap-3 md:grid-cols-2">
            {medicineTreatments.map((treatment) => (
              <TreatmentCard key={treatment.id} treatment={treatment} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeading title="History" />
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">No inventory changes recorded yet.</p>
        ) : (
          <Card className="divide-y divide-line">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {TRANSACTION_LABELS[transaction.type] ?? transaction.type}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(transaction.createdAt)}
                    {transaction.reason ? ` · ${transaction.reason}` : ""}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-bold ${
                    transaction.quantityDelta < 0 ? "text-danger-600" : "text-brand-700"
                  }`}
                >
                  {transaction.quantityDelta > 0 ? "+" : ""}
                  {transaction.quantityDelta} {transaction.unit}
                </p>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
