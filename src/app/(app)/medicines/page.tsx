import Link from "next/link";
import { Suspense } from "react";
import { listMedicines } from "@/server/medicines";
import { AddMedicineButton } from "@/components/AddMedicineButton";
import { ExpirationBadge } from "@/components/ExpirationBadge";
import { SearchInput } from "@/components/SearchInput";
import { Card, EmptyState, SkeletonRow } from "@/components/ui";
import { FORM_LABELS, type MedicineForm } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function MedicinesPage({ searchParams }: Props) {
  const { q } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Medicines</h1>
        <AddMedicineButton />
      </div>

      <Suspense fallback={null}>
        <SearchInput placeholder="Search by name or ingredient" />
      </Suspense>

      <Suspense key={q ?? ""} fallback={<ListSkeleton />}>
        <MedicineList search={q} />
      </Suspense>
    </div>
  );
}

async function MedicineList({ search }: { search?: string }) {
  const medicines = await listMedicines(search);

  if (medicines.length === 0) {
    return search ? (
      <EmptyState
        title={`No medicines match “${search}”`}
        description="Try a different name, or add it as a new medicine."
      />
    ) : (
      <EmptyState
        title="No medicines yet"
        description="Add the first package from your cabinet and MedHome will track quantity and expiry for you."
        action={<AddMedicineButton label="Add your first medicine" />}
      />
    );
  }

  return (
    <Card className="animate-fade-in divide-y divide-line">
      {medicines.map((medicine) => (
        <Link
          key={medicine.id}
          href={`/medicines/${medicine.id}`}
          className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">
              {medicine.name}
              {medicine.strength && (
                <span className="ml-1.5 text-sm font-medium text-muted">{medicine.strength}</span>
              )}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {FORM_LABELS[medicine.form as MedicineForm] ?? medicine.form}
              {medicine.batches.length > 0 &&
                ` · ${medicine.batches.length} package${medicine.batches.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[15px] font-bold text-ink">
              {medicine.totalQuantity}
              <span className="ml-1 text-xs font-medium text-muted">{medicine.unit}</span>
            </p>
            <div className="mt-0.5">
              <ExpirationBadge
                status={medicine.worstStatus}
                days={
                  medicine.batches.find((batch) => batch.status === medicine.worstStatus)
                    ?.daysUntilExpiration ?? null
                }
              />
            </div>
          </div>
        </Link>
      ))}
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonRow key={index} />
      ))}
    </div>
  );
}
