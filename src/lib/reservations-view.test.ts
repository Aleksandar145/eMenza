import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MealReservationStatus } from "@/lib/dashboard-mock";
import type { MealType, WorkingHoursRow } from "@/lib/meal-types";
import {
  countUpcomingReservationsByMealType,
  isUpcomingReservation,
} from "@/lib/reservations-view";

const workingHours: WorkingHoursRow[] = [
  {
    meal: "Doručak",
    type: "breakfast",
    weekday: "08:30 - 11:00",
    weekend: "08:30 - 10:00",
  },
  {
    meal: "Ručak",
    type: "lunch",
    weekday: "12:30 - 15:00",
    weekend: "12:30 - 14:00",
  },
  {
    meal: "Večera",
    type: "dinner",
    weekday: "17:30 - 19:30",
    weekend: "17:30 - 19:00",
  },
];

const todayKey = "2026-06-24";

function reservation(
  dateKey: string,
  mealType: MealType,
  status: MealReservationStatus = "zakazano",
) {
  return { dateKey, mealType, status };
}

describe("upcoming reservation counts", () => {
  it("counts future lunch", () => {
    const now = new Date(2026, 5, 24, 11, 1, 0, 0);
    const entries = [reservation("2026-06-25", "lunch")];

    assert.equal(
      countUpcomingReservationsByMealType(entries, "lunch", todayKey, workingHours, now),
      1,
    );
  });

  it("excludes past date lunch", () => {
    const now = new Date(2026, 5, 24, 11, 1, 0, 0);
    const entries = [reservation("2026-06-23", "lunch")];

    assert.equal(
      countUpcomingReservationsByMealType(entries, "lunch", todayKey, workingHours, now),
      0,
    );
  });

  it("excludes today's breakfast after its pickup window", () => {
    const now = new Date(2026, 5, 24, 11, 1, 0, 0);
    const entry = reservation("2026-06-24", "breakfast");

    assert.equal(isUpcomingReservation(entry, todayKey, workingHours, now), false);
  });

  it("includes today's lunch before its pickup window ends", () => {
    const now = new Date(2026, 5, 24, 11, 1, 0, 0);
    const entry = reservation("2026-06-24", "lunch");

    assert.equal(isUpcomingReservation(entry, todayKey, workingHours, now), true);
  });

  it("excludes consumed reservation on a past date", () => {
    const now = new Date(2026, 5, 24, 11, 1, 0, 0);
    const entry = reservation("2026-06-23", "lunch", "iskorisceno");

    assert.equal(isUpcomingReservation(entry, todayKey, workingHours, now), false);
  });

  it("excludes missed reservation on a future date", () => {
    const now = new Date(2026, 5, 24, 11, 1, 0, 0);
    const entry = reservation("2026-06-25", "dinner", "propusteno");

    assert.equal(isUpcomingReservation(entry, todayKey, workingHours, now), false);
  });
});
