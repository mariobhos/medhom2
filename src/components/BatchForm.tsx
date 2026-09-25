"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "./ui";
import { ApiError, apiRequest, parseQuantity } from "@/lib/client";
import { addDays, today } from "@/lib/dates";
import { QUANTITY_UNITS } from "@/lib/validation";
import type { BatchDto } from "@/lib/types";

type Props = {
  medicineId: string;
  batch?: BatchDto;
  defaultUnit?: string;
  onDone: () => void;
  onCancel: () => void;
};

/** Quick expiry presets — most packages expire in whole years. */
const EXPIRY_PRESETS = [
  { label: "+6 months", days: 183 },
  { label: "+1 year", days: 365 },
  { label: "+2 years", days: 730 },
];

export function BatchForm({ medicineId, batch, defaultUnit, onDone, onCancel }: Props) {
  const router = useRouter();
  const editing = Boolean(batch);

  const [quantity, setQuantity] = useState(batch ? String(batch.quantity) : "");
  const [unit, setUnit] = useState(batch?.unit ?? defaultUnit ?? "tablets");
  const [expirationDate, setExpirationDate] = useState(batch?.expirationDate ?? "");
  const [addedAt, setAddedAt] = useState(batch?.addedAt ?? today());
  const [notes, setNotes] = useState(batch?.notes ?? "");
  const [reason, setReason] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const quantityChanged = editing && parseQuantity(quantity) !== batch!.quantity;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFields({});

    const parsedQuantity = parseQuantity(quantity);
    if (parsedQuantity === null || parsedQuantity < 0) {
      setFields({ quantity: "Enter how many are in the package" });
      return;
    }

    setSubmitting(true);
    const payload = {
      quantity: parsedQuantity,
      unit,
      expirationDate: expirationDate || null,
      addedAt,
      notes: notes.trim() || undefined,
      ...(quantityChanged ? { reason: reason.trim() || undefined } : {}),
    };

    try {
      if (editing) {
        await apiRequest(`/api/batches/${batch!.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/api/medicines/${medicineId}/batches`, {
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" required error={fields.quantity}>
          <Input
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="20"
            autoFocus
            required
          />
        </Field>
        <Field label="Unit" error={fields.unit}>
          <Select value={unit} onChange={(event) => setUnit(event.target.value)}>
            {QUANTITY_UNITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <Field label="Expiration date" hint="optional" error={fields.expirationDate}>
          <Input
            type="date"
            value={expirationDate}
            onChange={(event) => setExpirationDate(event.target.value)}
          />
        </Field>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPIRY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setExpirationDate(addDays(today(), preset.days))}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand-200 hover:text-brand-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Date added" error={fields.addedAt}>
        <Input type="date" value={addedAt} onChange={(event) => setAddedAt(event.target.value)} />
      </Field>

      {quantityChanged && (
        <Field label="Reason for the quantity change" hint="optional">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Recounted the blister packs"
          />
        </Field>
      )}

      <Field label="Package notes" hint="optional" error={fields.notes}>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Opened, half a blister missing…"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" className="flex-1" loading={submitting}>
          {editing ? "Save package" : "Add package"}
        </Button>
      </div>
    </form>
  );
}
