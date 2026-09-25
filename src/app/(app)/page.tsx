import Link from "next/link";
import { Suspense } from "react";
import { getDashboardData } from "@/server/dashboard";
import { TreatmentCard } from "@/components/TreatmentCard";
import { ExpirationBadge } from "@/components/ExpirationBadge";
import { Card, EmptyState, SectionHeading, SkeletonRow } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import type { BatchDto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const data = await getDashboardData();
  const { overview } = data;
  const empty = overview.medicineCount === 0;

  return (
    <div className="animate-fade-in flex flex-col gap-7">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Medicine cabinet</h1>
          <span className="text-sm text-muted">{formatDate(data.today)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Medicines" value={overview.medicineCount} href="/medicines" />
          <Stat label="Treatments" value={overview.activeTreatmentCount} href="/treatments" />
          <Stat
            label="Expiring ≤30d"
            value={overview.expiringSoonPackages}
            href="/expiring"
            tone={overview.expiringSoonPackages > 0 ? "warn" : "neutral"}
          />
          <Stat
            label="Expired"
            value={overview.expiredPackages}
            href="/expiring"
            tone={overview.expiredPackages > 0 ? "danger" : "neutral"}
          />
        </div>
      </section>

      {empty && (
        <EmptyState
          title="Your cabinet is empty"
          description="Add the medicines you keep at home to start tracking quantities and expiry dates."
          action={
            <Link
              href="/medicines"
              className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-4 font-semibold text-white"
            >
              Add your first medicine
            </Link>
          }
        />
      )}

      {data.treatments.length > 0 && (
        <section>
          <SectionHeading
            title="Active treatments"
            count={data.treatments.length}
            action={
              <Link href="/treatments" className="text-sm font-semibold text-brand-700">
                All
              </Link>
            }
          />
          <div className="grid gap-3 md:grid-cols-2">
            {data.treatments.map((treatment) => (
              <TreatmentCard key={treatment.id} treatment={treatment} />
            ))}
          </div>
        </section>
      )}

      {data.runningLow.length > 0 && (
        <section>
          <SectionHeading title="Running low" count={data.runningLow.length} />
          <Card className="divide-y divide-line">
            {data.runningLow.map((treatment) => (
              <Link
                key={treatment.id}
                href={`/medicines/${treatment.medicineId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-canvas"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{treatment.medicineName}</p>
                  <p className="text-sm text-muted">
                    {treatment.available} {treatment.unit} left · {treatment.perDay}/day
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-warn-700">≈ {treatment.daysRemaining}d</p>
                  {treatment.runOutDate && (
                    <p className="text-xs text-muted">{formatDate(treatment.runOutDate)}</p>
                  )}
                </div>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {data.expiringSoon.length > 0 && (
        <section>
          <SectionHeading
            title="Expiring soon"
            count={data.expiringSoon.length}
            action={
              <Link href="/expiring" className="text-sm font-semibold text-brand-700">
                All
              </Link>
            }
          />
          <BatchList batches={data.expiringSoon} />
        </section>
      )}

      {data.expired.length > 0 && (
        <section>
          <SectionHeading title="Expired" count={data.expired.length} />
          <p className="mb-2 text-sm text-muted">
            These stay listed until you remove or discard them.
          </p>
          <BatchList batches={data.expired} />
        </section>
      )}
    </div>
  );
}

type BatchWithMedicine = BatchDto & { medicineName: string; medicineStrength: string | null };

function BatchList({ batches }: { batches: BatchWithMedicine[] }) {
  return (
    <Card className="divide-y divide-line">
      {batches.map((batch) => (
        <Link
          key={batch.id}
          href={`/medicines/${batch.medicineId}`}
          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-canvas"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {batch.medicineName}
              {batch.medicineStrength && (
                <span className="ml-1.5 text-sm font-medium text-muted">
                  {batch.medicineStrength}
                </span>
              )}
            </p>
            <p className="text-sm text-muted">
              {batch.quantity} {batch.unit} · {formatDate(batch.expirationDate)}
            </p>
          </div>
          <ExpirationBadge status={batch.status} days={batch.daysUntilExpiration} />
        </Link>
      ))}
    </Card>
  );
}

function Stat({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const tones = {
    neutral: "text-ink",
    warn: "text-warn-700",
    danger: "text-danger-600",
  } as const;

  return (
    <Link
      href={href}
      className="rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-sm transition-colors hover:border-brand-200"
    >
      <p className={`text-2xl font-bold tracking-tight ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-black/5" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}
