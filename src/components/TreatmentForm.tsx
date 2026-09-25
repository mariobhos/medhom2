"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "./ui";
import { ApiError, apiRequest, parseQuantity } from "@/lib/client";
import { today } from "@/lib/dates";
import type { MedicineDto, TreatmentDto } from "@/lib/types";

type Props = {
  medicines: Array<Pick<MedicineDto, "id" | "name" | "strength" | "unit">>;
  treatment?: TreatmentDto;
  defaultMedicineId?: string;
  onDone: () => void;
  onCancel: () => void;
};

export function TreatmentForm({
  medicines,
  treatment,
  defaultMedicineId,
  onDone,
  onCancel,
}: Props) {
  const router = useRouter();
  const editing = Boolean(treatment);

  const [medicineId, setMedicineId] = useState(
    treatment?.medicineId ?? defaultMedicineId ?? medicines[0]?.id ?? "",
  );
  const [name, setName] = useState(treatment?.name ?? "");
  const [doseQuantity, setDoseQuantity] = useState(String(treatment?.doseQuantity ?? 1));
  const [dosesPerDay, setDosesPerDay] = useState(String(treatment?.dosesPerDay ?? 3));
  const [startDate, setStartDate] = useState(treatment?.startDate ?? today());
  const [endDate, setEndDate] = useState(treatment?.endDate ?? "");
  const [notes, setNotes] = useState(treatment?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const unit = medicines.find((medicine) => medicine.id === medicineId)?.unit ?? "units";
  const parsedDose = parseQuantity(doseQuantity) ?? 0;
  const parsedPerDay = Number(dosesPerDay) || 0;
  const perDay = Math.round(parsedDose * parsedPerDay * 1000) / 1000;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);

    const payload = {
      medicineId,
      name: name.trim() || undefined,
      doseQuantity: parsedDose,
      dosesPerDay: parsedPerDay,
      startDate,
      endDate: endDate || null,
      notes: notes.trim() || undefined,
    };

    try {
      if (editing) {
        const { medicineId: _ignored, ...rest } = payload;
        await apiRequest(`/api/treatments/${treatment!.id}`, {
          method: "PATCH",
          body: JSON.stringify(rest),
        });
      } else {
        await apiRequest("/api/treatments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.refresh();
      onDone();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}

      <Field label="Medicine" required error={fields.medicineId}>
        <Select
          value={medicineId}
          onChange={(event) => setMedicineId(event.target.value)}
          disabled={editing}
          required
        >
          {medicines.map((medicine) => (
            <option key={medicine.id} value={medicine.id}>
              {medicine.name}
              {medicine.strength ? ` ${medicine.strength}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Reason or treatment name" hint="optional" error={fields.name}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Throat infection"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Dose (${unit})`} required error={fields.doseQuantity}>
          <Input
            inputMode="decimal"
            value={doseQuantity}
            onChange={(event) => setDoseQuantity(event.target.value)}
            required
          />
        </Field>
        <Field label="Doses per day" required error={fields.dosesPerDay}>
          <Input
            inputMode="numeric"
            value={dosesPerDay}
            onChange={(event) => setDosesPerDay(event.target.value)}
            required
          />
        </Field>
      </div>

      {perDay > 0 && (
        <p className="-mt-1 text-sm text-muted">
          That is{" "}
          <strong className="font-semibold text-ink">
            {perDay} {unit}
          </strong>{" "}
          per day.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" required error={fields.startDate}>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </Field>
        <Field label="End date" hint="optional" error={fields.endDate}>
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
      </div>

      <Field label="Notes" hint="optional" error={fields.notes}>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Take with food"
        />
      </Field>

      <p className="text-xs text-muted">
        MedHome only records what you enter. It does not suggest doses or treatment lengths.
      </p>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" className="flex-1" loading={submitting}>
          {editing ? "Save treatment" : "Start treatment"}
        </Button>
      </div>
    </form>
  );
}
