"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TreatmentCard } from "./TreatmentCard";
import { TreatmentForm } from "./TreatmentForm";
import { Sheet } from "./Sheet";
import { Button, Card, EmptyState, ErrorBanner, SectionHeading } from "./ui";
import { ApiError, apiRequest } from "@/lib/client";
import { formatDate } from "@/lib/dates";
import type { MedicineDto, TreatmentDto } from "@/lib/types";

type SheetState = { kind: "none" } | { kind: "new" } | { kind: "edit"; treatment: TreatmentDto };

export function TreatmentsBoard({
  treatments,
  medicines,
}: {
  treatments: TreatmentDto[];
  medicines: Array<Pick<MedicineDto, "id" | "name" | "strength" | "unit">>;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const close = () => setSheet({ kind: "none" });
  const active = treatments.filter((treatment) => treatment.active);
  const finished = treatments.filter((treatment) => !treatment.active);

  async function setActive(treatment: TreatmentDto, value: boolean) {
    setError(null);
    setBusyId(treatment.id);
    try {
      await apiRequest(`/api/treatments/${treatment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: value }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update the treatment.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(treatment: TreatmentDto) {
    if (!confirm("Delete this treatment? Recorded doses stay in your history.")) return;
    setError(null);
    setBusyId(treatment.id);
    try {
      await apiRequest(`/api/treatments/${treatment.id}`, { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the treatment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Treatments</h1>
        {medicines.length > 0 && <Button onClick={() => setSheet({ kind: "new" })}>New</Button>}
      </div>

      {error && <ErrorBanner message={error} />}

      {medicines.length === 0 ? (
        <EmptyState
          title="Add a medicine first"
          description="Treatments track what you are taking from the medicines in your cabinet."
          action={
            <Link
              href="/medicines"
              className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-4 font-semibold text-white"
            >
              Go to medicines
            </Link>
          }
        />
      ) : active.length === 0 ? (
        <EmptyState
          title="No active treatments"
          description="Start one to track daily consumption, days remaining and when you will run out."
          action={<Button onClick={() => setSheet({ kind: "new" })}>Start a treatment</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {active.map((treatment) => (
            <div key={treatment.id} className="flex flex-col gap-2">
              <TreatmentCard treatment={treatment} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setSheet({ kind: "edit", treatment })}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  loading={busyId === treatment.id}
                  onClick={() => setActive(treatment, false)}
                >
                  Finish
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={busyId === treatment.id}
                  onClick={() => remove(treatment)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <section>
          <SectionHeading title="Finished" count={finished.length} />
          <Card className="divide-y divide-line">
            {finished.map((treatment) => (
              <div key={treatment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{treatment.medicineName}</p>
                  <p className="text-xs text-muted">
                    {formatDate(treatment.startDate)} –{" "}
                    {treatment.endDate ? formatDate(treatment.endDate) : "stopped"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === treatment.id}
                    onClick={() => setActive(treatment, true)}
                  >
                    Resume
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === treatment.id}
                    onClick={() => remove(treatment)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <Sheet open={sheet.kind === "new"} onClose={close} title="Start a treatment">
        <TreatmentForm medicines={medicines} onDone={close} onCancel={close} />
      </Sheet>

      <Sheet open={sheet.kind === "edit"} onClose={close} title="Edit treatment">
        {sheet.kind === "edit" && (
          <TreatmentForm
            medicines={medicines}
            treatment={sheet.treatment}
            onDone={close}
            onCancel={close}
          />
        )}
      </Sheet>
    </div>
  );
}
