"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BatchForm } from "./BatchForm";
import { MedicineForm } from "./MedicineForm";
import { TreatmentForm } from "./TreatmentForm";
import { ExpirationBadge } from "./ExpirationBadge";
import { Sheet } from "./Sheet";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, SectionHeading, Select } from "./ui";
import { ApiError, apiRequest, parseQuantity } from "@/lib/client";
import { formatDate } from "@/lib/dates";
import type { BatchDto, MedicineDto } from "@/lib/types";
import { FORM_LABELS, type MedicineForm as MedicineFormType } from "@/lib/validation";

type SheetState =
  | { kind: "none" }
  | { kind: "edit-medicine" }
  | { kind: "add-batch" }
  | { kind: "edit-batch"; batch: BatchDto }
  | { kind: "adjust-batch"; batch: BatchDto }
  | { kind: "new-treatment" };

export function MedicineDetail({
  medicine,
  hasActiveTreatment,
}: {
  medicine: MedicineDto;
  hasActiveTreatment: boolean;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const close = () => setSheet({ kind: "none" });

  async function removeBatch(batch: BatchDto) {
    const label = batch.expirationDate
      ? `the package expiring ${formatDate(batch.expirationDate)}`
      : "this package";
    if (!confirm(`Remove ${label}? The change stays in your history.`)) return;

    setError(null);
    setBusyId(batch.id);
    try {
      await apiRequest(`/api/batches/${batch.id}?reason=Removed%20from%20cabinet`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not remove the package.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMedicine() {
    if (
      !confirm(
        `Delete ${medicine.name} and all of its packages, treatments and history? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError(null);
    setBusyId(medicine.id);
    try {
      await apiRequest(`/api/medicines/${medicine.id}`, { method: "DELETE" });
      router.push("/medicines");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete the medicine.");
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBanner message={error} />}

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {medicine.name}
              {medicine.strength && (
                <span className="ml-2 text-base font-semibold text-muted">{medicine.strength}</span>
              )}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {FORM_LABELS[medicine.form as MedicineFormType] ?? medicine.form}
              {medicine.activeIngredient && ` · ${medicine.activeIngredient}`}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setSheet({ kind: "edit-medicine" })}>
            Edit
          </Button>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-canvas px-3 py-3 text-center">
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">Total</dt>
            <dd className="text-lg font-bold text-ink">
              {medicine.totalQuantity}
              <span className="ml-1 text-xs font-medium text-muted">{medicine.unit}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">Usable</dt>
            <dd className="text-lg font-bold text-ink">{medicine.usableQuantity}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">Packages</dt>
            <dd className="text-lg font-bold text-ink">{medicine.batches.length}</dd>
          </div>
        </dl>

        {medicine.notes && (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-sm whitespace-pre-line text-muted">
            {medicine.notes}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={() => setSheet({ kind: "add-batch" })}>
            Add package
          </Button>
          {!hasActiveTreatment && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setSheet({ kind: "new-treatment" })}
            >
              Start treatment
            </Button>
          )}
        </div>
      </Card>

      <section>
        <SectionHeading title="Packages" count={medicine.batches.length} />

        {medicine.batches.length === 0 ? (
          <EmptyState
            title="No packages yet"
            description="Add a package so MedHome knows how much you have and when it expires."
            action={<Button onClick={() => setSheet({ kind: "add-batch" })}>Add package</Button>}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {medicine.batches.map((batch) => (
              <Card key={batch.id} className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold text-ink">
                      {batch.quantity}
                      <span className="ml-1 text-sm font-medium text-muted">{batch.unit}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      Expires {formatDate(batch.expirationDate)} · added{" "}
                      {formatDate(batch.addedAt)}
                    </p>
                    {batch.notes && (
                      <p className="mt-1 text-sm whitespace-pre-line text-muted">{batch.notes}</p>
                    )}
                  </div>
                  <ExpirationBadge status={batch.status} days={batch.daysUntilExpiration} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSheet({ kind: "adjust-batch", batch })}
                  >
                    Adjust
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSheet({ kind: "edit-batch", batch })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === batch.id}
                    onClick={() => removeBatch(batch)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div>
        <Button variant="danger" loading={busyId === medicine.id} onClick={deleteMedicine}>
          Delete medicine
        </Button>
      </div>

      <Sheet open={sheet.kind === "edit-medicine"} onClose={close} title="Edit medicine">
        <MedicineForm medicine={medicine} onDone={close} onCancel={close} />
      </Sheet>

      <Sheet
        open={sheet.kind === "add-batch"}
        onClose={close}
        title="Add package"
        description={`New package of ${medicine.name}`}
      >
        <BatchForm
          medicineId={medicine.id}
          defaultUnit={medicine.unit}
          onDone={close}
          onCancel={close}
        />
      </Sheet>

      <Sheet open={sheet.kind === "edit-batch"} onClose={close} title="Edit package">
        {sheet.kind === "edit-batch" && (
          <BatchForm
            medicineId={medicine.id}
            batch={sheet.batch}
            onDone={close}
            onCancel={close}
          />
        )}
      </Sheet>

      <Sheet
        open={sheet.kind === "adjust-batch"}
        onClose={close}
        title="Adjust quantity"
        description="Record a restock, a discard or a correction."
      >
        {sheet.kind === "adjust-batch" && (
          <AdjustForm medicine={medicine} batch={sheet.batch} onDone={close} onCancel={close} />
        )}
      </Sheet>

      <Sheet open={sheet.kind === "new-treatment"} onClose={close} title="Start treatment">
        <TreatmentForm
          medicines={[medicine]}
          defaultMedicineId={medicine.id}
          onDone={close}
          onCancel={close}
        />
      </Sheet>
    </div>
  );
}

const ADJUSTMENTS = [
  { type: "purchase_added", label: "Added stock", sign: 1 },
  { type: "discarded", label: "Discarded", sign: -1 },
  { type: "manual_correction", label: "Correction (+)", sign: 1 },
  { type: "manual_correction_down", label: "Correction (−)", sign: -1 },
] as const;

function AdjustForm({
  medicine,
  batch,
  onDone,
  onCancel,
}: {
  medicine: MedicineDto;
  batch: BatchDto;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof ADJUSTMENTS)[number]["type"]>("purchase_added");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = ADJUSTMENTS.find((option) => option.type === kind)!;
  const parsed = parseQuantity(amount) ?? 0;
  const resulting = Math.round((batch.quantity + selected.sign * parsed) * 1000) / 1000;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (parsed <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (resulting < 0) {
      setError("That would leave the package with a negative quantity.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/api/medicines/${medicine.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({
          batchId: batch.id,
          type: kind === "manual_correction_down" ? "manual_correction" : kind,
          quantityDelta: selected.sign * parsed,
          reason: reason.trim() || undefined,
        }),
      });
      router.refresh();
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the adjustment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}

      <Field label="What happened?">
        <Select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
          {ADJUSTMENTS.map((option) => (
            <option key={option.type} value={option.type}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={`Amount (${batch.unit})`} required>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="2"
          autoFocus
          required
        />
      </Field>

      <p className="-mt-1 text-sm text-muted">
        {batch.quantity} → <strong className="font-semibold text-ink">{resulting}</strong>{" "}
        {batch.unit}
      </p>

      <Field label="Reason" hint="optional">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Spilled, recounted, bought a refill…"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" className="flex-1" loading={submitting}>
          Save adjustment
        </Button>
      </div>
    </form>
  );
}
