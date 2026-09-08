import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkingHoursRow } from "@/lib/meal-types";
import { getTodayFocusMealType, isPickupWindowEnded, isWithinPickupWindow } from "@/lib/meal-pickup-window";

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

describe("meal pickup window focus", () => {
  it("focuses lunch after breakfast window ends", () => {
    const now = new Date(2026, 5, 24, 11, 1, 0, 0);

    assert.equal(isPickupWindowEnded(todayKey, "breakfast", workingHours, now), true);
    assert.equal(isPickupWindowEnded(todayKey, "lunch", workingHours, now), false);
    assert.equal(getTodayFocusMealType(todayKey, workingHours, now), "lunch");
  });

  it("focuses dinner after lunch window ends", () => {
    const now = new Date(2026, 5, 24, 15, 1, 0, 0);

    assert.equal(getTodayFocusMealType(todayKey, workingHours, now), "dinner");
  });

  it("focuses breakfast during breakfast window", () => {
    const now = new Date(2026, 5, 24, 9, 30, 0, 0);

    assert.equal(isWithinPickupWindow(todayKey, "breakfast", workingHours, now), true);
    assert.equal(getTodayFocusMealType(todayKey, workingHours, now), "breakfast");
  });

  it("focuses lunch during lunch window", () => {
    const now = new Date(2026, 5, 24, 13, 0, 0, 0);

    assert.equal(isWithinPickupWindow(todayKey, "lunch", workingHours, now), true);
    assert.equal(getTodayFocusMealType(todayKey, workingHours, now), "lunch");
  });
});
