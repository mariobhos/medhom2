import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { TreatmentDto } from "@/lib/types";
import { TakeDoseButton } from "./TakeDoseButton";
import { Card, Pill } from "./ui";

function daysTone(days: number | null): "brand" | "warn" | "danger" | "neutral" {
  if (days === null) return "neutral";
  if (days <= 2) return "danger";
  if (days <= 7) return "warn";
  return "brand";
}

export function TreatmentCard({ treatment }: { treatment: TreatmentDto }) {
  const { sufficiency } = treatment;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/medicines/${treatment.medicineId}`}
            className="block truncate text-[17px] font-bold tracking-tight text-ink hover:text-brand-700"
          >
            {treatment.medicineName}
            {treatment.medicineStrength && (
              <span className="ml-1.5 text-sm font-semibold text-muted">
                {treatment.medicineStrength}
              </span>
            )}
          </Link>
          <p className="mt-0.5 text-sm text-muted">
            {treatment.doseQuantity} {treatment.unit} × {treatment.dosesPerDay}/day
            {treatment.name ? ` · ${treatment.name}` : ""}
          </p>
        </div>
        {treatment.dosesTakenToday > 0 && (
          <Pill tone="brand">
            {treatment.dosesTakenToday}/{treatment.dosesPerDay} today
          </Pill>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-canvas px-3 py-2.5 text-center">
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">Left</dt>
          <dd className="text-[15px] font-bold text-ink">
            {treatment.available}
            <span className="ml-0.5 text-xs font-medium text-muted">{treatment.unit}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">Days</dt>
          <dd className="text-[15px] font-bold text-ink">
            {treatment.daysRemaining === null ? "—" : `≈ ${treatment.daysRemaining}`}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">Runs out</dt>
          <dd className="text-[15px] font-bold text-ink">
            {treatment.runOutDate ? formatDate(treatment.runOutDate) : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Pill tone={daysTone(treatment.daysRemaining)}>
          {treatment.perDay} {treatment.unit}/day
        </Pill>
        {treatment.endDate && (
          <Pill tone="neutral">Until {formatDate(treatment.endDate)}</Pill>
        )}
      </div>

      {sufficiency && !sufficiency.sufficient && (
        <p className="mt-2 rounded-xl border border-warn-100 bg-warn-50 px-3 py-2 text-sm font-medium text-warn-700">
          Not enough to finish this treatment: {sufficiency.required} {treatment.unit} needed,{" "}
          {sufficiency.deficit} {treatment.unit} short.
        </p>
      )}

      {sufficiency && sufficiency.sufficient && sufficiency.daysToCover > 0 && (
        <p className="mt-2 text-sm text-brand-700">
          Enough stock to finish all {sufficiency.daysToCover} remaining days.
        </p>
      )}

      <TakeDoseButton treatment={treatment} size="lg" className="mt-3" />
    </Card>
  );
}
