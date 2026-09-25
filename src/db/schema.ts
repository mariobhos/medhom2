import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A medicine is the abstract product ("Ibuprofen 400 mg tablets").
 * Physical stock lives in `medicineBatches`.
 */
export const medicines = pgTable(
  "medicines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    activeIngredient: text("active_ingredient"),
    strength: text("strength"),
    form: text("form").notNull().default("other"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("medicines_name_idx").on(table.name)],
);

/**
 * One physical package / batch of a medicine, with its own quantity and
 * expiration date. Several batches of the same medicine are tracked separately.
 */
export const medicineBatches = pgTable(
  "medicine_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    quantity: doublePrecision("quantity").notNull().default(0),
    unit: text("unit").notNull().default("tablets"),
    expirationDate: date("expiration_date", { mode: "string" }),
    addedAt: date("added_at", { mode: "string" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("medicine_batches_medicine_idx").on(table.medicineId),
    index("medicine_batches_expiration_idx").on(table.expirationDate),
  ],
);

/** A course of medicine the owner is currently taking. */
export const treatments = pgTable(
  "treatments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    name: text("name"),
    doseQuantity: doublePrecision("dose_quantity").notNull(),
    dosesPerDay: integer("doses_per_day").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("treatments_medicine_idx").on(table.medicineId)],
);

/** A recorded "I took this dose" event. */
export const doseEvents = pgTable(
  "dose_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treatmentId: uuid("treatment_id").references(() => treatments.id, { onDelete: "set null" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    quantity: doublePrecision("quantity").notNull(),
    unit: text("unit").notNull().default("tablets"),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (table) => [
    index("dose_events_treatment_idx").on(table.treatmentId),
    index("dose_events_taken_at_idx").on(table.takenAt),
  ],
);

export const transactionTypes = [
  "dose_consumed",
  "purchase_added",
  "discarded",
  "manual_correction",
  "package_added",
  "package_removed",
] as const;

export type TransactionType = (typeof transactionTypes)[number];

/**
 * Append-only audit log of every inventory change. Quantities are never
 * silently overwritten: each change is recorded here with a signed delta.
 */
export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => medicineBatches.id, { onDelete: "set null" }),
    doseEventId: uuid("dose_event_id").references(() => doseEvents.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    quantityDelta: doublePrecision("quantity_delta").notNull(),
    unit: text("unit").notNull().default("tablets"),
    quantityAfter: doublePrecision("quantity_after"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_transactions_medicine_idx").on(table.medicineId),
    index("inventory_transactions_created_at_idx").on(table.createdAt),
  ],
);

export const medicinesRelations = relations(medicines, ({ many }) => ({
  batches: many(medicineBatches),
  treatments: many(treatments),
  transactions: many(inventoryTransactions),
  doseEvents: many(doseEvents),
}));

export const medicineBatchesRelations = relations(medicineBatches, ({ one }) => ({
  medicine: one(medicines, {
    fields: [medicineBatches.medicineId],
    references: [medicines.id],
  }),
}));

export const treatmentsRelations = relations(treatments, ({ one, many }) => ({
  medicine: one(medicines, {
    fields: [treatments.medicineId],
    references: [medicines.id],
  }),
  doseEvents: many(doseEvents),
}));

export const doseEventsRelations = relations(doseEvents, ({ one }) => ({
  treatment: one(treatments, {
    fields: [doseEvents.treatmentId],
    references: [treatments.id],
  }),
  medicine: one(medicines, {
    fields: [doseEvents.medicineId],
    references: [medicines.id],
  }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  medicine: one(medicines, {
    fields: [inventoryTransactions.medicineId],
    references: [medicines.id],
  }),
  batch: one(medicineBatches, {
    fields: [inventoryTransactions.batchId],
    references: [medicineBatches.id],
  }),
}));

export type Medicine = typeof medicines.$inferSelect;
export type MedicineBatch = typeof medicineBatches.$inferSelect;
export type Treatment = typeof treatments.$inferSelect;
export type DoseEvent = typeof doseEvents.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
