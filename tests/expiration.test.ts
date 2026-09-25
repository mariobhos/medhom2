import { describe, expect, it } from "vitest";
import {
  categorizeExpiration,
  compareByExpiration,
  daysUntilExpiration,
  isExpired,
  needsAttention,
} from "@/lib/expiration";
import { addDays } from "@/lib/dates";

const TODAY = "2026-09-25";

describe("categorizeExpiration", () => {
  it("marks yesterday as expired", () => {
    expect(categorizeExpiration(addDays(TODAY, -1), TODAY)).toBe("expired");
  });

  it("marks today as expiring within 30 days rather than expired", () => {
    expect(categorizeExpiration(TODAY, TODAY)).toBe("expires_30");
  });

  it("uses the 30 day boundary inclusively", () => {
    expect(categorizeExpiration(addDays(TODAY, 30), TODAY)).toBe("expires_30");
    expect(categorizeExpiration(addDays(TODAY, 31), TODAY)).toBe("expires_90");
  });

  it("uses the 90 day boundary inclusively", () => {
    expect(categorizeExpiration(addDays(TODAY, 90), TODAY)).toBe("expires_90");
    expect(categorizeExpiration(addDays(TODAY, 91), TODAY)).toBe("ok");
  });

  it("reports packages without a date as unknown", () => {
    expect(categorizeExpiration(null, TODAY)).toBe("unknown");
  });
});

describe("daysUntilExpiration", () => {
  it("counts forward and backward", () => {
    expect(daysUntilExpiration("2026-10-02", TODAY)).toBe(7);
    expect(daysUntilExpiration("2026-09-18", TODAY)).toBe(-7);
  });

  it("crosses month and year boundaries correctly", () => {
    expect(daysUntilExpiration("2027-01-01", "2026-12-31")).toBe(1);
    expect(daysUntilExpiration("2028-03-01", "2028-02-28")).toBe(2); // 2028 is a leap year
  });

  it("returns null without a date", () => {
    expect(daysUntilExpiration(null, TODAY)).toBeNull();
  });
});

describe("isExpired / needsAttention", () => {
  it("only treats past dates as expired", () => {
    expect(isExpired("2026-09-24", TODAY)).toBe(true);
    expect(isExpired(TODAY, TODAY)).toBe(false);
    expect(isExpired(null, TODAY)).toBe(false);
  });

  it("flags expired and soon-to-expire buckets for attention", () => {
    expect(needsAttention("expired")).toBe(true);
    expect(needsAttention("expires_30")).toBe(true);
    expect(needsAttention("expires_90")).toBe(true);
    expect(needsAttention("ok")).toBe(false);
    expect(needsAttention("unknown")).toBe(false);
  });
});

describe("compareByExpiration", () => {
  it("sorts soonest first and undated last", () => {
    const sorted = [
      { expirationDate: null },
      { expirationDate: "2027-08-01" },
      { expirationDate: "2027-01-01" },
    ].sort(compareByExpiration);

    expect(sorted.map((item) => item.expirationDate)).toEqual([
      "2027-01-01",
      "2027-08-01",
      null,
    ]);
  });
});
