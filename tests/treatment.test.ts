import { describe, expect, it } from "vitest";
import {
  dailyConsumption,
  daysRemaining,
  isRunningLow,
  projectTreatment,
  runOutDate,
  treatmentSufficiency,
} from "@/lib/treatment";

const TODAY = "2026-09-25";

describe("dailyConsumption", () => {
  it("multiplies dose size by doses per day", () => {
    expect(dailyConsumption({ doseQuantity: 1, dosesPerDay: 3 })).toBe(3);
    expect(dailyConsumption({ doseQuantity: 2, dosesPerDay: 2 })).toBe(4);
  });

  it("handles fractional doses", () => {
    expect(dailyConsumption({ doseQuantity: 0.5, dosesPerDay: 3 })).toBe(1.5);
    expect(dailyConsumption({ doseQuantity: 7.5, dosesPerDay: 3 })).toBe(22.5);
  });
});

describe("daysRemaining", () => {
  it("matches the worked example: 21 capsules at 3/day is 7 days", () => {
    expect(daysRemaining(21, 3)).toBe(7);
  });

  it("rounds down to whole days of full coverage", () => {
    expect(daysRemaining(20, 3)).toBe(6);
    expect(daysRemaining(2, 3)).toBe(0);
  });

  it("is zero when nothing is left", () => {
    expect(daysRemaining(0, 3)).toBe(0);
  });

  it("is null when the treatment consumes nothing", () => {
    expect(daysRemaining(10, 0)).toBeNull();
  });
});

describe("runOutDate", () => {
  it("matches the worked example: 21 capsules from 25 Sep runs out 2 Oct", () => {
    expect(runOutDate(21, 3, "2026-09-25")).toBe("2026-10-02");
  });

  it("is today when there is not enough for a full day", () => {
    expect(runOutDate(2, 3, TODAY)).toBe(TODAY);
  });

  it("crosses a month boundary correctly", () => {
    expect(runOutDate(30, 3, "2026-09-25")).toBe("2026-10-05");
  });

  it("is null for a treatment that consumes nothing", () => {
    expect(runOutDate(10, 0, TODAY)).toBeNull();
  });
});

describe("treatmentSufficiency", () => {
  it("counts the end date as a day to cover", () => {
    const result = treatmentSufficiency({
      available: 21,
      perDay: 3,
      asOf: "2026-09-25",
      endDate: "2026-10-01",
    })!;

    expect(result.daysToCover).toBe(7);
    expect(result.required).toBe(21);
    expect(result.deficit).toBe(0);
    expect(result.sufficient).toBe(true);
  });

  it("reports the shortfall when inventory is not enough", () => {
    const result = treatmentSufficiency({
      available: 10,
      perDay: 3,
      asOf: "2026-09-25",
      endDate: "2026-10-04",
    })!;

    expect(result.daysToCover).toBe(10);
    expect(result.required).toBe(30);
    expect(result.deficit).toBe(20);
    expect(result.sufficient).toBe(false);
  });

  it("is null for an open-ended treatment", () => {
    expect(
      treatmentSufficiency({ available: 10, perDay: 3, asOf: TODAY, endDate: null }),
    ).toBeNull();
  });

  it("needs nothing once the end date has passed", () => {
    const result = treatmentSufficiency({
      available: 0,
      perDay: 3,
      asOf: "2026-09-25",
      endDate: "2026-09-20",
    })!;

    expect(result.daysToCover).toBe(0);
    expect(result.required).toBe(0);
    expect(result.sufficient).toBe(true);
  });
});

describe("projectTreatment", () => {
  it("produces the full projection for the worked example", () => {
    const projection = projectTreatment({
      schedule: { doseQuantity: 1, dosesPerDay: 3 },
      available: 21,
      asOf: "2026-09-25",
      endDate: null,
    });

    expect(projection).toMatchObject({
      perDay: 3,
      available: 21,
      daysRemaining: 7,
      runOutDate: "2026-10-02",
      sufficiency: null,
    });
  });

  it("flags an insufficient course against its end date", () => {
    const projection = projectTreatment({
      schedule: { doseQuantity: 1, dosesPerDay: 3 },
      available: 12,
      asOf: "2026-09-25",
      endDate: "2026-10-04",
    });

    expect(projection.daysRemaining).toBe(4);
    expect(projection.sufficiency?.sufficient).toBe(false);
    expect(projection.sufficiency?.deficit).toBe(18);
  });

  it("marks a treatment with a week or less of stock as running low", () => {
    const low = projectTreatment({
      schedule: { doseQuantity: 1, dosesPerDay: 3 },
      available: 21,
      asOf: TODAY,
    });
    const fine = projectTreatment({
      schedule: { doseQuantity: 1, dosesPerDay: 3 },
      available: 60,
      asOf: TODAY,
    });

    expect(isRunningLow(low)).toBe(true);
    expect(isRunningLow(fine)).toBe(false);
  });
});
