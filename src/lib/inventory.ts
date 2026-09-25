import { isExpired } from "./expiration";
import type { IsoDate } from "./dates";

/** Rounds away floating point noise (quantities are kept to 3 decimals). */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export type BatchLike = {
  id: string;
  quantity: number;
  expirationDate: IsoDate | null;
};

export type BatchDeduction = {
  batchId: string;
  /** Positive amount taken from this batch. */
  quantity: number;
  /** Batch quantity after the deduction. */
  quantityAfter: number;
};

export class InsufficientInventoryError extends Error {
  readonly requested: number;
  readonly available: number;

  constructor(requested: number, available: number) {
    super(
      `Not enough medicine available: requested ${round3(requested)}, available ${round3(available)}.`,
    );
    this.name = "InsufficientInventoryError";
    this.requested = requested;
    this.available = available;
  }
}

/** Total quantity across batches, optionally excluding expired ones. */
export function totalQuantity(
  batches: BatchLike[],
  options: { asOf?: IsoDate | Date; excludeExpired?: boolean } = {},
): number {
  const { asOf, excludeExpired = false } = options;
  const usable =
    excludeExpired && asOf ? batches.filter((b) => !isExpired(b.expirationDate, asOf)) : batches;
  return round3(usable.reduce((sum, batch) => sum + batch.quantity, 0));
}

/**
 * Batches that may be consumed from, ordered first-expiring-first.
 * Expired batches are never consumed automatically; batches without an
 * expiration date are used after all dated ones.
 */
export function consumableBatches(batches: BatchLike[], asOf: IsoDate | Date): BatchLike[] {
  return batches
    .filter((batch) => batch.quantity > 0 && !isExpired(batch.expirationDate, asOf))
    .sort((a, b) => {
      if (a.expirationDate && b.expirationDate) {
        if (a.expirationDate !== b.expirationDate) {
          return a.expirationDate < b.expirationDate ? -1 : 1;
        }
        return a.id < b.id ? -1 : 1;
      }
      if (!a.expirationDate && !b.expirationDate) return a.id < b.id ? -1 : 1;
      return a.expirationDate ? -1 : 1;
    });
}

/**
 * Works out which batches to take a dose from, using a first-expiring-first
 * strategy across however many packages exist.
 *
 * Throws `InsufficientInventoryError` when the non-expired stock cannot cover
 * the requested quantity; nothing is deducted in that case.
 */
export function planConsumption(
  batches: BatchLike[],
  quantity: number,
  asOf: IsoDate | Date,
): BatchDeduction[] {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity to consume must be a positive number.");
  }

  const candidates = consumableBatches(batches, asOf);
  const available = round3(candidates.reduce((sum, batch) => sum + batch.quantity, 0));
  if (available < round3(quantity)) {
    throw new InsufficientInventoryError(quantity, available);
  }

  const deductions: BatchDeduction[] = [];
  let remaining = round3(quantity);

  for (const batch of candidates) {
    if (remaining <= 0) break;
    const take = round3(Math.min(batch.quantity, remaining));
    if (take <= 0) continue;
    deductions.push({
      batchId: batch.id,
      quantity: take,
      quantityAfter: round3(batch.quantity - take),
    });
    remaining = round3(remaining - take);
  }

  return deductions;
}
