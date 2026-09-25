import { describe, expect, it } from "vitest";
import {
  consumableBatches,
  InsufficientInventoryError,
  planConsumption,
  totalQuantity,
  type BatchLike,
} from "@/lib/inventory";

const TODAY = "2026-09-25";

function batch(id: string, quantity: number, expirationDate: string | null): BatchLike {
  return { id, quantity, expirationDate };
}

describe("planConsumption", () => {
  it("takes a whole dose from a single package", () => {
    const deductions = planConsumption([batch("a", 21, "2027-01-31")], 1, TODAY);

    expect(deductions).toEqual([{ batchId: "a", quantity: 1, quantityAfter: 20 }]);
  });

  it("consumes from the first-expiring package when several exist", () => {
    const batches = [
      batch("later", 20, "2027-08-31"),
      batch("sooner", 5, "2026-10-31"),
      batch("latest", 30, "2028-01-31"),
    ];

    const deductions = planConsumption(batches, 1, TODAY);

    expect(deductions).toEqual([{ batchId: "sooner", quantity: 1, quantityAfter: 4 }]);
  });

  it("spills over into the next package when the first one runs out", () => {
    const batches = [batch("sooner", 2, "2026-10-31"), batch("later", 20, "2027-08-31")];

    const deductions = planConsumption(batches, 5, TODAY);

    expect(deductions).toEqual([
      { batchId: "sooner", quantity: 2, quantityAfter: 0 },
      { batchId: "later", quantity: 3, quantityAfter: 17 },
    ]);
  });

  it("spreads a large dose across three packages in expiry order", () => {
    const batches = [
      batch("c", 4, "2027-05-01"),
      batch("a", 3, "2026-11-01"),
      batch("b", 2, "2027-01-01"),
    ];

    const deductions = planConsumption(batches, 8, TODAY);

    expect(deductions.map((deduction) => deduction.batchId)).toEqual(["a", "b", "c"]);
    expect(deductions.map((deduction) => deduction.quantity)).toEqual([3, 2, 3]);
    expect(deductions.at(-1)?.quantityAfter).toBe(1);
  });

  it("never consumes from an expired package", () => {
    const batches = [batch("expired", 50, "2026-09-24"), batch("good", 10, "2027-01-01")];

    const deductions = planConsumption(batches, 3, TODAY);

    expect(deductions).toEqual([{ batchId: "good", quantity: 3, quantityAfter: 7 }]);
  });

  it("treats a package expiring today as still usable", () => {
    const deductions = planConsumption([batch("today", 4, TODAY)], 2, TODAY);

    expect(deductions).toEqual([{ batchId: "today", quantity: 2, quantityAfter: 2 }]);
  });

  it("uses dated packages before undated ones", () => {
    const batches = [batch("undated", 10, null), batch("dated", 10, "2027-02-01")];

    const deductions = planConsumption(batches, 1, TODAY);

    expect(deductions[0].batchId).toBe("dated");
  });

  it("refuses to consume more than is available and deducts nothing", () => {
    const batches = [batch("a", 2, "2027-01-01"), batch("b", 1, "2027-02-01")];

    expect(() => planConsumption(batches, 5, TODAY)).toThrow(InsufficientInventoryError);

    try {
      planConsumption(batches, 5, TODAY);
    } catch (error) {
      const insufficient = error as InsufficientInventoryError;
      expect(insufficient.requested).toBe(5);
      expect(insufficient.available).toBe(3);
    }
  });

  it("ignores expired stock when deciding whether there is enough", () => {
    const batches = [batch("expired", 100, "2020-01-01"), batch("good", 1, "2027-01-01")];

    expect(() => planConsumption(batches, 2, TODAY)).toThrow(InsufficientInventoryError);
  });

  it("handles fractional doses without floating point drift", () => {
    const deductions = planConsumption([batch("syrup", 10, "2027-01-01")], 2.5, TODAY);

    expect(deductions).toEqual([{ batchId: "syrup", quantity: 2.5, quantityAfter: 7.5 }]);
  });

  it("rejects a non-positive quantity", () => {
    expect(() => planConsumption([batch("a", 5, null)], 0, TODAY)).toThrow(
      /positive number/,
    );
  });
});

describe("consumableBatches", () => {
  it("skips empty and expired packages and orders by expiry", () => {
    const batches = [
      batch("empty", 0, "2026-10-01"),
      batch("expired", 5, "2026-09-01"),
      batch("second", 5, "2027-03-01"),
      batch("first", 5, "2026-12-01"),
    ];

    expect(consumableBatches(batches, TODAY).map((b) => b.id)).toEqual(["first", "second"]);
  });
});

describe("totalQuantity", () => {
  it("adds up every package by default", () => {
    const batches = [batch("a", 10, "2020-01-01"), batch("b", 20, "2027-01-01")];

    expect(totalQuantity(batches)).toBe(30);
  });

  it("can exclude expired packages", () => {
    const batches = [batch("a", 10, "2020-01-01"), batch("b", 20, "2027-01-01")];

    expect(totalQuantity(batches, { asOf: TODAY, excludeExpired: true })).toBe(20);
  });
});
