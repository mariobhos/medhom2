import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  doseEvents,
  inventoryTransactions,
  medicineBatches,
  medicines,
  treatments,
  type MedicineBatch,
  type TransactionType,
} from "@/db/schema";
import { today } from "@/lib/dates";
import {
  categorizeExpiration,
  compareByExpiration,
  daysUntilExpiration,
  expirationStatusRank,
  type ExpirationStatus,
} from "@/lib/expiration";
import { planConsumption, round3, totalQuantity } from "@/lib/inventory";
import { projectTreatment } from "@/lib/treatment";
import { NotFoundError } from "@/lib/api";
import type {
  BatchDto,
  MedicineDto,
  TransactionDto,
  TreatmentDto,
} from "@/lib/types";
import type { BatchInput, MedicineInput, TreatmentInput } from "@/lib/validation";

function toBatchDto(batch: MedicineBatch, asOf: string): BatchDto {
  return {
    id: batch.id,
    medicineId: batch.medicineId,
    quantity: round3(batch.quantity),
    unit: batch.unit,
    expirationDate: batch.expirationDate,
    addedAt: batch.addedAt,
    notes: batch.notes,
    status: categorizeExpiration(batch.expirationDate, asOf),
    daysUntilExpiration: daysUntilExpiration(batch.expirationDate, asOf),
  };
}

function worstStatus(batches: BatchDto[]): ExpirationStatus {
  if (batches.length === 0) return "unknown";
  return batches.reduce<ExpirationStatus>(
    (worst, batch) =>
      expirationStatusRank(batch.status) < expirationStatusRank(worst) ? batch.status : worst,
    "unknown",
  );
}

function dominantUnit(batches: BatchDto[], fallback: string): string {
  if (batches.length === 0) return fallback;
  const counts = new Map<string, number>();
  for (const batch of batches) counts.set(batch.unit, (counts.get(batch.unit) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function toMedicineDto(
  medicine: typeof medicines.$inferSelect,
  batchRows: MedicineBatch[],
  asOf: string,
): MedicineDto {
  const batches = batchRows.map((batch) => toBatchDto(batch, asOf)).sort(compareByExpiration);
  const dated = batches.filter((batch) => batch.expirationDate);

  return {
    id: medicine.id,
    name: medicine.name,
    activeIngredient: medicine.activeIngredient,
    strength: medicine.strength,
    form: medicine.form,
    notes: medicine.notes,
    batches,
    totalQuantity: totalQuantity(batches),
    usableQuantity: totalQuantity(batches, { asOf, excludeExpired: true }),
    unit: dominantUnit(batches, "units"),
    worstStatus: worstStatus(batches),
    nextExpirationDate: dated.length > 0 ? dated[0].expirationDate : null,
  };
}

/** All medicines with their batches, optionally filtered by a name search. */
export async function listMedicines(search?: string): Promise<MedicineDto[]> {
  const asOf = today();
  const term = search?.trim();

  const rows = await db
    .select()
    .from(medicines)
    .where(
      term
        ? sql`(${medicines.name} ILIKE ${`%${term}%`} OR coalesce(${medicines.activeIngredient}, '') ILIKE ${`%${term}%`})`
        : undefined,
    )
    .orderBy(asc(medicines.name));

  if (rows.length === 0) return [];

  const batchRows = await db.select().from(medicineBatches);
  const byMedicine = new Map<string, MedicineBatch[]>();
  for (const batch of batchRows) {
    const list = byMedicine.get(batch.medicineId) ?? [];
    list.push(batch);
    byMedicine.set(batch.medicineId, list);
  }

  return rows.map((medicine) => toMedicineDto(medicine, byMedicine.get(medicine.id) ?? [], asOf));
}

export async function getMedicine(id: string): Promise<MedicineDto | null> {
  const asOf = today();
  const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id)).limit(1);
  if (!medicine) return null;

  const batchRows = await db
    .select()
    .from(medicineBatches)
    .where(eq(medicineBatches.medicineId, id));

  return toMedicineDto(medicine, batchRows, asOf);
}

export async function createMedicine(input: MedicineInput): Promise<MedicineDto> {
  const [created] = await db.insert(medicines).values(input).returning();
  return toMedicineDto(created, [], today());
}

export async function updateMedicine(id: string, input: MedicineInput): Promise<MedicineDto> {
  const [updated] = await db
    .update(medicines)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(medicines.id, id))
    .returning();
  if (!updated) throw new NotFoundError("Medicine");
  const medicine = await getMedicine(id);
  return medicine!;
}

export async function deleteMedicine(id: string): Promise<void> {
  const [deleted] = await db.delete(medicines).where(eq(medicines.id, id)).returning();
  if (!deleted) throw new NotFoundError("Medicine");
}

/** Adds a package/batch and records the matching inventory transaction. */
export async function addBatch(medicineId: string, input: BatchInput): Promise<BatchDto> {
  return db.transaction(async (tx) => {
    const [medicine] = await tx
      .select()
      .from(medicines)
      .where(eq(medicines.id, medicineId))
      .limit(1);
    if (!medicine) throw new NotFoundError("Medicine");

    const [batch] = await tx
      .insert(medicineBatches)
      .values({ ...input, medicineId, quantity: round3(input.quantity) })
      .returning();

    await tx.insert(inventoryTransactions).values({
      medicineId,
      batchId: batch.id,
      type: "package_added",
      quantityDelta: batch.quantity,
      unit: batch.unit,
      quantityAfter: batch.quantity,
      reason: input.notes ?? null,
    });

    return toBatchDto(batch, today());
  });
}

export async function updateBatch(
  batchId: string,
  input: Partial<BatchInput> & { reason?: string | null },
): Promise<BatchDto> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(medicineBatches)
      .where(eq(medicineBatches.id, batchId))
      .limit(1);
    if (!existing) throw new NotFoundError("Package");

    const { reason, ...fields } = input;
    const nextQuantity =
      fields.quantity === undefined ? existing.quantity : round3(fields.quantity);

    const [updated] = await tx
      .update(medicineBatches)
      .set({ ...fields, quantity: nextQuantity, updatedAt: new Date() })
      .where(eq(medicineBatches.id, batchId))
      .returning();

    // A quantity edit is a manual correction: keep it in the audit trail
    // instead of silently overwriting the old number.
    const delta = round3(nextQuantity - existing.quantity);
    if (delta !== 0) {
      await tx.insert(inventoryTransactions).values({
        medicineId: existing.medicineId,
        batchId,
        type: "manual_correction",
        quantityDelta: delta,
        unit: updated.unit,
        quantityAfter: nextQuantity,
        reason: reason ?? null,
      });
    }

    return toBatchDto(updated, today());
  });
}

export async function deleteBatch(batchId: string, reason?: string | null): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(medicineBatches)
      .where(eq(medicineBatches.id, batchId))
      .limit(1);
    if (!existing) throw new NotFoundError("Package");

    await tx.insert(inventoryTransactions).values({
      medicineId: existing.medicineId,
      batchId: null,
      type: "package_removed",
      quantityDelta: round3(-existing.quantity),
      unit: existing.unit,
      quantityAfter: 0,
      reason: reason ?? existing.notes ?? null,
    });

    await tx.delete(medicineBatches).where(eq(medicineBatches.id, batchId));
  });
}

/** Manual stock change: restock, discard or correction against one batch. */
export async function adjustInventory(params: {
  medicineId: string;
  batchId: string | null;
  type: TransactionType;
  quantityDelta: number;
  reason: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const delta = round3(params.quantityDelta);
    let unit = "units";
    let quantityAfter: number | null = null;

    if (params.batchId) {
      const [batch] = await tx
        .select()
        .from(medicineBatches)
        .where(eq(medicineBatches.id, params.batchId))
        .limit(1);
      if (!batch) throw new NotFoundError("Package");

      const next = round3(batch.quantity + delta);
      if (next < 0) {
        throw new Error("A package cannot hold a negative quantity.");
      }
      await tx
        .update(medicineBatches)
        .set({ quantity: next, updatedAt: new Date() })
        .where(eq(medicineBatches.id, params.batchId));
      unit = batch.unit;
      quantityAfter = next;
    }

    await tx.insert(inventoryTransactions).values({
      medicineId: params.medicineId,
      batchId: params.batchId,
      type: params.type,
      quantityDelta: delta,
      unit,
      quantityAfter,
      reason: params.reason,
    });
  });
}

// ---------------------------------------------------------------------------
// Treatments
// ---------------------------------------------------------------------------

type TreatmentRow = typeof treatments.$inferSelect;

async function buildTreatmentDtos(rows: TreatmentRow[]): Promise<TreatmentDto[]> {
  if (rows.length === 0) return [];
  const asOf = today();

  const medicineRows = await db.select().from(medicines);
  const batchRows = await db.select().from(medicineBatches);
  const medicineById = new Map(medicineRows.map((m) => [m.id, m]));

  const batchesByMedicine = new Map<string, MedicineBatch[]>();
  for (const batch of batchRows) {
    const list = batchesByMedicine.get(batch.medicineId) ?? [];
    list.push(batch);
    batchesByMedicine.set(batch.medicineId, list);
  }

  const doseRows = await db
    .select({
      treatmentId: doseEvents.treatmentId,
      takenAt: doseEvents.takenAt,
    })
    .from(doseEvents)
    .orderBy(desc(doseEvents.takenAt));

  return rows.map((treatment) => {
    const medicine = medicineById.get(treatment.medicineId);
    const batches = (batchesByMedicine.get(treatment.medicineId) ?? []).map((batch) =>
      toBatchDto(batch, asOf),
    );
    const available = totalQuantity(batches, { asOf, excludeExpired: true });
    const projection = projectTreatment({
      schedule: { doseQuantity: treatment.doseQuantity, dosesPerDay: treatment.dosesPerDay },
      available,
      asOf,
      endDate: treatment.endDate,
    });

    const treatmentDoses = doseRows.filter((dose) => dose.treatmentId === treatment.id);
    const dosesTakenToday = treatmentDoses.filter(
      (dose) => dose.takenAt.toISOString().slice(0, 10) === asOf,
    ).length;

    return {
      id: treatment.id,
      medicineId: treatment.medicineId,
      medicineName: medicine?.name ?? "Unknown medicine",
      medicineStrength: medicine?.strength ?? null,
      name: treatment.name,
      doseQuantity: treatment.doseQuantity,
      dosesPerDay: treatment.dosesPerDay,
      startDate: treatment.startDate,
      endDate: treatment.endDate,
      notes: treatment.notes,
      active: treatment.active,
      unit: dominantUnit(batches, "units"),
      perDay: projection.perDay,
      available: projection.available,
      daysRemaining: projection.daysRemaining,
      runOutDate: projection.runOutDate,
      sufficiency: projection.sufficiency,
      lastDoseAt: treatmentDoses[0]?.takenAt.toISOString() ?? null,
      dosesTakenToday,
    };
  });
}

export async function listTreatments(options: { activeOnly?: boolean } = {}): Promise<TreatmentDto[]> {
  const rows = await db
    .select()
    .from(treatments)
    .where(options.activeOnly ? eq(treatments.active, true) : undefined)
    .orderBy(desc(treatments.active), desc(treatments.startDate));

  return buildTreatmentDtos(rows);
}

export async function getTreatment(id: string): Promise<TreatmentDto | null> {
  const [row] = await db.select().from(treatments).where(eq(treatments.id, id)).limit(1);
  if (!row) return null;
  const [dto] = await buildTreatmentDtos([row]);
  return dto ?? null;
}

export async function createTreatment(input: TreatmentInput): Promise<TreatmentDto> {
  const [medicine] = await db
    .select()
    .from(medicines)
    .where(eq(medicines.id, input.medicineId))
    .limit(1);
  if (!medicine) throw new NotFoundError("Medicine");

  const [created] = await db.insert(treatments).values(input).returning();
  const [dto] = await buildTreatmentDtos([created]);
  return dto;
}

export async function updateTreatment(
  id: string,
  input: Partial<TreatmentInput>,
): Promise<TreatmentDto> {
  const [updated] = await db
    .update(treatments)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(treatments.id, id))
    .returning();
  if (!updated) throw new NotFoundError("Treatment");
  const [dto] = await buildTreatmentDtos([updated]);
  return dto;
}

export async function deleteTreatment(id: string): Promise<void> {
  const [deleted] = await db.delete(treatments).where(eq(treatments.id, id)).returning();
  if (!deleted) throw new NotFoundError("Treatment");
}

/**
 * Records a dose: stores the dose event, deducts the quantity from the
 * first-expiring non-expired packages and logs one transaction per package.
 * The whole thing runs in a single database transaction.
 */
export async function recordDose(
  treatmentId: string,
  options: { quantity?: number; takenAt?: string; notes?: string | null } = {},
): Promise<TreatmentDto> {
  const asOf = today();

  await db.transaction(async (tx) => {
    const [treatment] = await tx
      .select()
      .from(treatments)
      .where(eq(treatments.id, treatmentId))
      .limit(1);
    if (!treatment) throw new NotFoundError("Treatment");

    const quantity = round3(options.quantity ?? treatment.doseQuantity);

    // Lock the batches for this medicine so two concurrent doses cannot both
    // consume the same stock.
    const batchRows = await tx
      .select()
      .from(medicineBatches)
      .where(eq(medicineBatches.medicineId, treatment.medicineId))
      .for("update");

    const deductions = planConsumption(
      batchRows.map((batch) => ({
        id: batch.id,
        quantity: batch.quantity,
        expirationDate: batch.expirationDate,
      })),
      quantity,
      asOf,
    );

    const unitByBatch = new Map(batchRows.map((batch) => [batch.id, batch.unit]));

    const [doseEvent] = await tx
      .insert(doseEvents)
      .values({
        treatmentId,
        medicineId: treatment.medicineId,
        quantity,
        unit: unitByBatch.get(deductions[0].batchId) ?? "units",
        takenAt: options.takenAt ? new Date(options.takenAt) : new Date(),
        notes: options.notes ?? null,
      })
      .returning();

    for (const deduction of deductions) {
      await tx
        .update(medicineBatches)
        .set({ quantity: deduction.quantityAfter, updatedAt: new Date() })
        .where(eq(medicineBatches.id, deduction.batchId));

      await tx.insert(inventoryTransactions).values({
        medicineId: treatment.medicineId,
        batchId: deduction.batchId,
        doseEventId: doseEvent.id,
        type: "dose_consumed",
        quantityDelta: round3(-deduction.quantity),
        unit: unitByBatch.get(deduction.batchId) ?? "units",
        quantityAfter: deduction.quantityAfter,
        reason: options.notes ?? null,
      });
    }
  });

  const updated = await getTreatment(treatmentId);
  if (!updated) throw new NotFoundError("Treatment");
  return updated;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function listTransactions(options: {
  medicineId?: string;
  limit?: number;
} = {}): Promise<TransactionDto[]> {
  const limit = Math.min(options.limit ?? 100, 500);

  const rows = await db
    .select({
      transaction: inventoryTransactions,
      medicineName: medicines.name,
    })
    .from(inventoryTransactions)
    .innerJoin(medicines, eq(inventoryTransactions.medicineId, medicines.id))
    .where(
      options.medicineId ? eq(inventoryTransactions.medicineId, options.medicineId) : undefined,
    )
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(limit);

  return rows.map(({ transaction, medicineName }) => ({
    id: transaction.id,
    medicineId: transaction.medicineId,
    medicineName,
    batchId: transaction.batchId,
    type: transaction.type as TransactionType,
    quantityDelta: round3(transaction.quantityDelta),
    unit: transaction.unit,
    quantityAfter: transaction.quantityAfter === null ? null : round3(transaction.quantityAfter),
    reason: transaction.reason,
    createdAt: transaction.createdAt.toISOString(),
  }));
}