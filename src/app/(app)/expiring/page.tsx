import Link from "next/link";
import { getExpiringBatches } from "@/server/dashboard";
import { ExpirationBadge } from "@/components/ExpirationBadge";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import type { ExpirationStatus } from "@/lib/expiration";

export const dynamic = "force-dynamic";

const GROUPS: Array<{ status: ExpirationStatus; title: string; blurb: string }> = [
  {
    status: "expired",
    title: "Expired",
    blurb: "Still in your cabinet. Remove or discard them when you can.",
  },
  {
    status: "expires_30",
    title: "Expires within 30 days",
    blurb: "Use these first.",
  },
  {
    status: "expires_90",
    title: "Expires within 90 days",
    blurb: "Worth keeping an eye on.",
  },
];

export default async function ExpiringPage() {
  const batches = await getExpiringBatches();

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Expiring soon</h1>
        <p className="mt-1 text-sm text-muted">Ordered by expiration date, most urgent first.</p>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title="Nothing expires in the next 90 days"
          description="Packages will show up here as their expiry date gets closer."
        />
      ) : (
        GROUPS.map((group) => {
          const groupBatches = batches.filter((batch) => batch.status === group.status);
          if (groupBatches.length === 0) return null;

          return (
            <section key={group.status}>
              <SectionHeading title={group.title} count={groupBatches.length} />
              <p className="mb-2 text-sm text-muted">{group.blurb}</p>
              <Card className="divide-y divide-line">
                {groupBatches.map((batch) => (
                  <Link
                    key={batch.id}
                    href={`/medicines/${batch.medicineId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-canvas"
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
                        {batch.quantity} {batch.unit} · expires {formatDate(batch.expirationDate)}
                      </p>
                    </div>
                    <ExpirationBadge status={batch.status} days={batch.daysUntilExpiration} />
                  </Link>
                ))}
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
