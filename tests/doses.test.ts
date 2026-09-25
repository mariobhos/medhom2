import { describe, expect, it } from "vitest";
import { planConsumption, round3, type BatchLike } from "@/lib/inventory";
import { projectTreatment } from "@/lib/treatment";

const TODAY = "2026-09-25";

/**
 * Applies a consumption plan to a set of batches the same way the database
 * transaction does, so a whole course of doses can be simulated.
 */
function applyPlan(batches: BatchLike[], quantity: number, asOf: string): BatchLike[] {
  const deductions = planConsumption(batches, quantity, asOf);
  const byId = new Map(deductions.map((deduction) => [deduction.batchId, deduction]));

  return batches.map((batch) => {
    const deduction = byId.get(batch.id);
    return deduction ? { ...batch, quantity: deduction.quantityAfter } : batch;
  });
}

describe("recording doses against inventory", () => {
  it("empties the first-expiring package before touching the next one", () => {
    // 5 tablets expiring next month, 20 expiring next year.
    let batches: BatchLike[] = [
      { id: "next-month", quantity: 5, expirationDate: "2026-10-31" },
      { id: "next-year", quantity: 20, expirationDate: "2027-10-31" },
    ];

    for (let dose = 0; dose < 5; dose += 1) {
      batches = applyPlan(batches, 1, TODAY);
    }

    expect(batches.find((batch) => batch.id === "next-month")?.quantity).toBe(0);
    expect(batches.find((batch) => batch.id === "next-year")?.quantity).toBe(20);

    batches = applyPlan(batches, 1, TODAY);
    expect(batches.find((batch) => batch.id === "next-year")?.quantity).toBe(19);
  });

  it("updates the run-out projection after each dose", () => {
    let batches: BatchLike[] = [{ id: "a", quantity: 21, expirationDate: "2027-01-01" }];
    const schedule = { doseQuantity: 1, dosesPerDay: 3 };

    const before = projectTreatment({
      schedule,
      available: round3(batches[0].quantity),
      asOf: TODAY,
    });
    expect(before.daysRemaining).toBe(7);
    expect(before.runOutDate).toBe("2026-10-02");

    batches = applyPlan(batches, schedule.doseQuantity, TODAY);

    const after = projectTreatment({
      schedule,
      available: round3(batches[0].quantity),
      asOf: TODAY,
    });
    expect(after.available).toBe(20);
    expect(after.daysRemaining).toBe(6);
    expect(after.runOutDate).toBe("2026-10-01");
  });

  it("runs a full three-day course across two packages", () => {
    let batches: BatchLike[] = [
      { id: "small", quantity: 4, expirationDate: "2026-11-01" },
      { id: "large", quantity: 10, expirationDate: "2027-11-01" },
    ];

    // 1 capsule, 3 times a day, for 3 days = 9 capsules.
    for (let day = 0; day < 3; day += 1) {
      for (let dose = 0; dose < 3; dose += 1) {
        batches = applyPlan(batches, 1, TODAY);
      }
    }

    expect(batches).toEqual([
      { id: "small", quantity: 0, expirationDate: "2026-11-01" },
      { id: "large", quantity: 5, expirationDate: "2027-11-01" },
    ]);
  });

  it("stops the course when the remaining stock cannot cover a dose", () => {
    const batches: BatchLike[] = [{ id: "a", quantity: 0.5, expirationDate: "2027-01-01" }];

    expect(() => applyPlan(batches, 1, TODAY)).toThrow(/Not enough medicine available/);
  });

  it("keeps expired stock out of both the plan and the projection", () => {
    const batches: BatchLike[] = [
      { id: "expired", quantity: 30, expirationDate: "2026-09-01" },
      { id: "good", quantity: 6, expirationDate: "2027-01-01" },
    ];

    const usable = batches
      .filter((batch) => (batch.expirationDate ?? "9999-12-31") >= TODAY)
      .reduce((sum, batch) => sum + batch.quantity, 0);

    const projection = projectTreatment({
      schedule: { doseQuantity: 1, dosesPerDay: 3 },
      available: usable,
      asOf: TODAY,
    });

    expect(projection.available).toBe(6);
    expect(projection.daysRemaining).toBe(2);

    const after = applyPlan(batches, 1, TODAY);
    expect(after.find((batch) => batch.id === "expired")?.quantity).toBe(30);
    expect(after.find((batch) => batch.id === "good")?.quantity).toBe(5);
  });
});
