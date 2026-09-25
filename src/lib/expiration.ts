import { daysBetween, type IsoDate } from "./dates";

export type ExpirationStatus = "expired" | "expires_30" | "expires_90" | "ok" | "unknown";

export const EXPIRATION_LABELS: Record<ExpirationStatus, string> = {
  expired: "Expired",
  expires_30: "Expires ≤ 30 days",
  expires_90: "Expires ≤ 90 days",
  ok: "Not close to expiry",
  unknown: "No expiry date",
};

/**
 * Buckets an expiration date relative to `asOf`:
 * - `expired`     the date is in the past
 * - `expires_30`  today through 30 days from now
 * - `expires_90`  31 through 90 days from now
 * - `ok`          more than 90 days away
 * - `unknown`     no expiration date recorded
 */
export function categorizeExpiration(
  expirationDate: IsoDate | Date | null | undefined,
  asOf: IsoDate | Date,
): ExpirationStatus {
  if (!expirationDate) return "unknown";
  const days = daysBetween(asOf, expirationDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expires_30";
  if (days <= 90) return "expires_90";
  return "ok";
}

/** Days until expiry; negative when already expired, `null` when unknown. */
export function daysUntilExpiration(
  expirationDate: IsoDate | Date | null | undefined,
  asOf: IsoDate | Date,
): number | null {
  if (!expirationDate) return null;
  return daysBetween(asOf, expirationDate);
}

export function isExpired(
  expirationDate: IsoDate | Date | null | undefined,
  asOf: IsoDate | Date,
): boolean {
  return categorizeExpiration(expirationDate, asOf) === "expired";
}

/** True for the buckets that need the owner's attention (≤ 90 days or expired). */
export function needsAttention(status: ExpirationStatus): boolean {
  return status === "expired" || status === "expires_30" || status === "expires_90";
}

const ORDER: Record<ExpirationStatus, number> = {
  expired: 0,
  expires_30: 1,
  expires_90: 2,
  ok: 3,
  unknown: 4,
};

/** Sort comparator: most urgent first, undated last. */
export function compareByExpiration(
  a: { expirationDate: IsoDate | null },
  b: { expirationDate: IsoDate | null },
): number {
  if (a.expirationDate === b.expirationDate) return 0;
  if (!a.expirationDate) return 1;
  if (!b.expirationDate) return -1;
  return a.expirationDate < b.expirationDate ? -1 : 1;
}

export function expirationStatusRank(status: ExpirationStatus): number {
  return ORDER[status];
}
