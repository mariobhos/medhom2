/**
 * Date helpers. All medicine dates are calendar dates (`YYYY-MM-DD`) and are
 * treated as timezone-independent so that "expires on the 1st" never shifts.
 */

export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === "string" && ISO_DATE.test(value);
}

/** Converts a `Date` or ISO date string into a `YYYY-MM-DD` string. */
export function toIsoDate(value: Date | IsoDate): IsoDate {
  if (typeof value === "string") {
    if (!ISO_DATE.test(value)) {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
      return parsed.toISOString().slice(0, 10);
    }
    return value;
  }
  return value.toISOString().slice(0, 10);
}

/** Midnight UTC timestamp for a calendar date. */
function utcMillis(value: Date | IsoDate): number {
  const [year, month, day] = toIsoDate(value).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

const MS_PER_DAY = 86_400_000;

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: Date | IsoDate, to: Date | IsoDate): number {
  return Math.round((utcMillis(to) - utcMillis(from)) / MS_PER_DAY);
}

export function addDays(value: Date | IsoDate, days: number): IsoDate {
  return new Date(utcMillis(value) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Today in the server's local timezone, as a calendar date. */
export function today(): IsoDate {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(value: Date | IsoDate | null | undefined): string {
  if (!value) return "—";
  const iso = toIsoDate(value);
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
