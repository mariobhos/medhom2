import "server-only";

import { today } from "@/lib/dates";
import { needsAttention } from "@/lib/expiration";
import { RUNNING_LOW_DAYS } from "@/lib/treatment";
import type { BatchDto, DashboardData } from "@/lib/types";
import { listMedicines, listTreatments } from "./medicines";

type BatchWithMedicine = BatchDto & {
  medicineName: string;
  medicineStrength: string | null;
};

/** Everything the home dashboard renders, in one round of queries. */
export async function getDashboardData(): Promise<DashboardData> {
  const asOf = today();
  const [medicines, treatments] = await Promise.all([listMedicines(), listTreatments()]);

  const allBatches: BatchWithMedicine[] = medicines.flatMap((medicine) =>
    medicine.batches.map((batch) => ({
      ...batch,
      medicineName: medicine.name,
      medicineStrength: medicine.strength,
    })),
  );

  const byExpiration = (a: BatchWithMedicine, b: BatchWithMedicine) => {
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;
    return a.expirationDate < b.expirationDate ? -1 : 1;
  };

  const expired = allBatches.filter((batch) => batch.status === "expired").sort(byExpiration);
  const expiringSoon = allBatches
    .filter((batch) => batch.status === "expires_30" || batch.status === "expires_90")
    .sort(byExpiration);

  const activeTreatments = treatments.filter((treatment) => treatment.active);
  const runningLow = activeTreatments
    .filter(
      (treatment) => treatment.daysRemaining !== null && treatment.daysRemaining <= RUNNING_LOW_DAYS,
    )
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  return {
    today: asOf,
    overview: {
      medicineCount: medicines.length,
      activeTreatmentCount: activeTreatments.length,
      expiredPackages: expired.length,
      expiringSoonPackages: allBatches.filter((batch) => batch.status === "expires_30").length,
      totalPackages: allBatches.length,
    },
    treatments: activeTreatments,
    expiringSoon: expiringSoon.slice(0, 8),
    expired,
    runningLow,
  };
}

/** Batches that need attention, most urgent first — the "Expiring soon" view. */
export async function getExpiringBatches(): Promise<BatchWithMedicine[]> {
  const medicines = await listMedicines();

  return medicines
    .flatMap((medicine) =>
      medicine.batches.map((batch) => ({
        ...batch,
        medicineName: medicine.name,
        medicineStrength: medicine.strength,
      })),
    )
    .filter((batch) => needsAttention(batch.status))
    .sort((a, b) => {
      if (!a.expirationDate) return 1;
      if (!b.expirationDate) return -1;
      return a.expirationDate < b.expirationDate ? -1 : 1;
    });
}
