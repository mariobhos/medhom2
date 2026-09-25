import { addDays, daysBetween, type IsoDate } from "./dates";
import { round3 } from "./inventory";

export type TreatmentSchedule = {
  doseQuantity: number;
  dosesPerDay: number;
};

/** How much medicine a treatment consumes per day. */
export function dailyConsumption(schedule: TreatmentSchedule): number {
  return round3(schedule.doseQuantity * schedule.dosesPerDay);
}

/**
 * Whole days of medicine left. `null` when the treatment does not consume
 * anything per day (so it never runs out).
 */
export function daysRemaining(available: number, perDay: number): number | null {
  if (perDay <= 0) return null;
  if (available <= 0) return 0;
  return Math.floor(round3(available) / perDay);
}

/**
 * The first day on which a full day of doses can no longer be taken.
 * With 21 capsules at 3/day starting today, today plus the following 6 days are
 * covered, so the run-out date is 7 days from today.
 */
export function runOutDate(
  available: number,
  perDay: number,
  asOf: IsoDate | Date,
): IsoDate | null {
  const days = daysRemaining(available, perDay);
  if (days === null) return null;
  return addDays(asOf, days);
}

export type SufficiencyResult = {
  /** Days still to cover, including today, up to and including the end date. */
  daysToCover: number;
  /** Quantity needed to finish the treatment. */
  required: number;
  /** Quantity missing; 0 when inventory is enough. */
  deficit: number;
  sufficient: boolean;
};

/**
 * Whether the current inventory can complete a treatment that has an end date.
 * Returns `null` for open-ended treatments (nothing to compare against).
 */
export function treatmentSufficiency(params: {
  available: number;
  perDay: number;
  asOf: IsoDate | Date;
  endDate: IsoDate | null | undefined;
}): SufficiencyResult | null {
  const { available, perDay, asOf, endDate } = params;
  if (!endDate) return null;

  const daysToCover = Math.max(0, daysBetween(asOf, endDate) + 1);
  const required = round3(daysToCover * perDay);
  const deficit = round3(Math.max(0, required - round3(available)));

  return {
    daysToCover,
    required,
    deficit,
    sufficient: deficit <= 0,
  };
}

export type TreatmentProjection = {
  perDay: number;
  available: number;
  daysRemaining: number | null;
  runOutDate: IsoDate | null;
  sufficiency: SufficiencyResult | null;
};

/** Everything the UI needs to describe an active treatment's stock situation. */
export function projectTreatment(params: {
  schedule: TreatmentSchedule;
  available: number;
  asOf: IsoDate | Date;
  endDate?: IsoDate | null;
}): TreatmentProjection {
  const perDay = dailyConsumption(params.schedule);
  const available = round3(params.available);

  return {
    perDay,
    available,
    daysRemaining: daysRemaining(available, perDay),
    runOutDate: runOutDate(available, perDay, params.asOf),
    sufficiency: treatmentSufficiency({
      available,
      perDay,
      asOf: params.asOf,
      endDate: params.endDate ?? null,
    }),
  };
}

/** Treatments with fewer than this many days of stock are "running low". */
export const RUNNING_LOW_DAYS = 7;

export function isRunningLow(projection: TreatmentProjection): boolean {
  return projection.daysRemaining !== null && projection.daysRemaining <= RUNNING_LOW_DAYS;
}
