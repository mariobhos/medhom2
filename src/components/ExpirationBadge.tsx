import { formatDate } from "@/lib/dates";
import type { ExpirationStatus } from "@/lib/expiration";
import { Pill } from "./ui";

const TONE: Record<ExpirationStatus, "neutral" | "brand" | "danger" | "warn" | "info"> = {
  expired: "danger",
  expires_30: "warn",
  expires_90: "info",
  ok: "brand",
  unknown: "neutral",
};

function shortLabel(status: ExpirationStatus, days: number | null): string {
  switch (status) {
    case "expired":
      return days === null ? "Expired" : `Expired ${Math.abs(days)}d ago`;
    case "expires_30":
      return days === 0 ? "Expires today" : `${days}d left`;
    case "expires_90":
      return `${days}d left`;
    case "ok":
      return "In date";
    default:
      return "No expiry";
  }
}

export function ExpirationBadge({
  status,
  days,
  date,
  showDate = false,
}: {
  status: ExpirationStatus;
  days: number | null;
  date?: string | null;
  showDate?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Pill tone={TONE[status]}>{shortLabel(status, days)}</Pill>
      {showDate && date && <span className="text-xs text-muted">{formatDate(date)}</span>}
    </span>
  );
}
