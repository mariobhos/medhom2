"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "./ui";
import { ApiError, apiRequest, parseQuantity } from "@/lib/client";
import { today } from "@/lib/dates";
import {
  DEFAULT_UNIT_BY_FORM,
  FORM_LABELS,
  MEDICINE_FORMS,
  QUANTITY_UNITS,
  type MedicineForm as MedicineFormType,
} from "@/lib/validation";
import type { MedicineDto } from "@/lib/types";

type Props = {
  medicine?: MedicineDto;
  /** Show the "first package" fields so a new medicine can be added in one step. */
  withFirstPackage?: boolean;
  onDone: (medicineId: string) => void;
  onCancel?: () => void;
};

export function MedicineForm({ medicine, withFirstPackage = false, onDone, onCancel }: Props) {
  const router = useRouter();
  const editing = Boolean(medicine);

  const [name, setName] = useState(medicine?.name ?? "");
  const [activeIngredient, setActiveIngredient] = useState(medicine?.activeIngredient ?? "");
  const [strength, setStrength] = useState(medicine?.strength ?? "");
  const [form, setForm] = useState<MedicineFormType>(
    (medicine?.form as MedicineFormType) ?? "tablet",
  );
  const [notes, setNotes] = useState(medicine?.notes ?? "");

  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>(DEFAULT_UNIT_BY_FORM.tablet);
  const [unitTouched, setUnitTouched] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function changeForm(next: MedicineFormType) {
    setForm(next);
    if (!unitTouched) setUnit(DEFAULT_UNIT_BY_FORM[next]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      activeIngredient: activeIngredient.trim() || undefined,
      strength: strength.trim() || undefined,
      form,
      notes: notes.trim() || undefined,
    };

    try {
      const saved = editing
        ? await apiRequest<{ medicine: MedicineDto }>(`/api/medicines/${medicine!.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ medicine: MedicineDto }>("/api/medicines", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      const parsedQuantity = parseQuantity(quantity);
      if (!editing && withFirstPackage && parsedQuantity !== null && parsedQuantity > 0) {
        await apiRequest(`/api/medicines/${saved.medicine.id}/batches`, {
          method: "POST",
          body: JSON.stringify({
            quantity: parsedQuantity,
            unit,
            expirationDate: expirationDate || null,
            addedAt: today(),
          }),
        });
      }

      router.refresh();
      onDone(saved.medicine.id);
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

      <Field label="Name" required error={fields.name}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ibuprofen"
          autoFocus
          required
          enterKeyHint="next"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Strength" hint="optional" error={fields.strength}>
          <Input
            value={strength}
            onChange={(event) => setStrength(event.target.value)}
            placeholder="400 mg"
          />
        </Field>

        <Field label="Form" error={fields.form}>
          <Select value={form} onChange={(event) => changeForm(event.target.value as MedicineFormType)}>
            {MEDICINE_FORMS.map((value) => (
              <option key={value} value={value}>
                {FORM_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Active ingredient" hint="optional" error={fields.activeIngredient}>
        <Input
          value={activeIngredient}
          onChange={(event) => setActiveIngredient(event.target.value)}
          placeholder="Ibuprofen"
        />
      </Field>

      {!editing && withFirstPackage && (
        <fieldset className="rounded-xl border border-line bg-canvas/60 p-3.5">
          <legend className="px-1 text-xs font-semibold tracking-wide text-muted uppercase">
            First package
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" hint="optional">
              <Input
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="20"
              />
            </Field>
            <Field label="Unit">
              <Select
                value={unit}
                onChange={(event) => {
                  setUnit(event.target.value);
                  setUnitTouched(true);
                }}
              >
                {QUANTITY_UNITS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Expires" hint="optional" className="mt-3">
            <Input
              type="date"
              value={expirationDate}
              onChange={(event) => setExpirationDate(event.target.value)}
            />
          </Field>
        </fieldset>
      )}

      <Field label="Notes" hint="optional" error={fields.notes}>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Kitchen drawer, bought at the pharmacy on the corner…"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1" loading={submitting}>
          {editing ? "Save changes" : "Add medicine"}
        </Button>
      </div>
    </form>
  );
}
