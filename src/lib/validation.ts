import { z } from "zod";
import { transactionTypes } from "@/db/schema";

export const MEDICINE_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "cream",
  "spray",
  "drops",
  "other",
] as const;

export const QUANTITY_UNITS = [
  "tablets",
  "capsules",
  "ml",
  "doses",
  "drops",
  "sachets",
  "puffs",
  "g",
  "units",
] as const;

export type MedicineForm = (typeof MEDICINE_FORMS)[number];
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

/** Default quantity unit for a medicine form, so forms can prefill sensibly. */
export const DEFAULT_UNIT_BY_FORM: Record<MedicineForm, QuantityUnit> = {
  tablet: "tablets",
  capsule: "capsules",
  syrup: "ml",
  cream: "g",
  spray: "doses",
  drops: "ml",
  other: "units",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), "Invalid date");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((value) => (value === "" ? null : (value ?? null)));

const quantity = z
  .number({ error: "Enter a number" })
  .finite("Enter a number")
  .min(0, "Cannot be negative")
  .max(1_000_000, "That quantity looks too large");

export const medicineInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  activeIngredient: optionalText(160),
  strength: optionalText(80),
  form: z.enum(MEDICINE_FORMS),
  notes: optionalText(2000),
});

export const batchInputSchema = z.object({
  quantity: quantity,
  unit: z.enum(QUANTITY_UNITS),
  expirationDate: isoDate.nullish().transform((value) => value ?? null),
  addedAt: isoDate,
  notes: optionalText(2000),
});

export const batchUpdateSchema = batchInputSchema.partial().extend({
  /** Optional note explaining a manual quantity correction. */
  reason: optionalText(400),
});

export const treatmentInputSchema = z
  .object({
    medicineId: z.string().uuid("Select a medicine"),
    name: optionalText(160),
    doseQuantity: z
      .number({ error: "Enter a dose quantity" })
      .positive("Dose must be greater than 0")
      .max(10_000),
    dosesPerDay: z
      .number({ error: "Enter the number of doses per day" })
      .int("Use a whole number")
      .min(1, "At least 1 dose per day")
      .max(24, "At most 24 doses per day"),
    startDate: isoDate,
    endDate: isoDate.nullish().transform((value) => value ?? null),
    notes: optionalText(2000),
    active: z.boolean().optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  });

export const treatmentUpdateSchema = z.object({
  name: optionalText(160),
  doseQuantity: z.number().positive().max(10_000).optional(),
  dosesPerDay: z.number().int().min(1).max(24).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.nullish().transform((value) => value ?? null),
  notes: optionalText(2000),
  active: z.boolean().optional(),
});

export const doseInputSchema = z.object({
  /** Defaults to the treatment's configured dose quantity when omitted. */
  quantity: z.number().positive("Dose must be greater than 0").max(10_000).optional(),
  takenAt: z.string().datetime({ offset: true }).optional(),
  notes: optionalText(400),
});

export const adjustmentSchema = z.object({
  batchId: z.string().uuid().nullish(),
  type: z.enum(transactionTypes),
  /** Signed change: negative discards/corrections down, positive restocks. */
  quantityDelta: z.number().finite().refine((value) => value !== 0, "Enter a non-zero amount"),
  reason: optionalText(400),
});

export type MedicineInput = z.infer<typeof medicineInputSchema>;
export type BatchInput = z.infer<typeof batchInputSchema>;
export type TreatmentInput = z.infer<typeof treatmentInputSchema>;
export type DoseInput = z.infer<typeof doseInputSchema>;

export const FORM_LABELS: Record<MedicineForm, string> = {
  tablet: "Tablet",
  capsule: "Capsule",
  syrup: "Syrup",
  cream: "Cream",
  spray: "Spray",
  drops: "Drops",
  other: "Other",
};

export const TRANSACTION_LABELS: Record<(typeof transactionTypes)[number], string> = {
  dose_consumed: "Dose taken",
  purchase_added: "Stock added",
  discarded: "Discarded",
  manual_correction: "Manual correction",
  package_added: "Package added",
  package_removed: "Package removed",
};
