import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_WORKING_HOURS } from "@/lib/admin-system-mock";
import {
  canBookMealSlot,
  canCancelMealSlot,
  canShowAiPreporuka,
  getReservationDeadlineAt,
  formatReservationTimeRemaining,
  isMealReservationWindowPassed,
} from "@/lib/meal-booking-window";

const workingHours = DEFAULT_WORKING_HOURS;

describe("meal-booking-window 24h rule", () => {
  it("blocks dinner on March 5 at March 4 17:30", () => {
    const now = new Date(2026, 2, 4, 17, 30, 0, 0);
    assert.equal(
      isMealReservationWindowPassed("2026-03-05", "dinner", now, workingHours),
      true,
    );
  });

  it("allows dinner on March 5 at March 4 17:29", () => {
    const now = new Date(2026, 2, 4, 17, 29, 0, 0);
    assert.equal(
      isMealReservationWindowPassed("2026-03-05", "dinner", now, workingHours),
      false,
    );
  });

  it("allows breakfast on March 6 while app today is March 3", () => {
    const now = new Date(2026, 2, 3, 14, 0, 0, 0);
    assert.equal(
      canBookMealSlot("2026-03-06", "breakfast", "nerezervisano", now, workingHours),
      true,
    );
  });

  it("uses service start for deadline (dinner March 5 -> March 4 17:30)", () => {
    const deadline = getReservationDeadlineAt("2026-03-05", "dinner", workingHours);
    assert.ok(deadline);
    assert.equal(deadline.getFullYear(), 2026);
    assert.equal(deadline.getMonth(), 2);
    assert.equal(deadline.getDate(), 4);
    assert.equal(deadline.getHours(), 17);
    assert.equal(deadline.getMinutes(), 30);
  });

  it("formats remaining reservation time", () => {
    const now = new Date(2026, 2, 3, 10, 0, 0, 0);
    assert.equal(
      formatReservationTimeRemaining("2026-03-06", "breakfast", now, workingHours),
      "još 1 dan i 22 sata",
    );
  });

  it("allows cancellation before deadline and blocks after", () => {
    const beforeDeadline = new Date(2026, 2, 3, 10, 0, 0, 0);
    const afterDeadline = new Date(2026, 2, 5, 8, 30, 0, 0);

    assert.equal(canCancelMealSlot("2026-03-06", "breakfast", beforeDeadline, workingHours), true);
    assert.equal(canCancelMealSlot("2026-03-06", "breakfast", afterDeadline, workingHours), false);
  });

  it("hides AI preporuka after reservation window passes", () => {
    const beforeDeadline = new Date(2026, 2, 4, 17, 29, 0, 0);
    const afterDeadline = new Date(2026, 2, 4, 17, 30, 0, 0);

    assert.equal(canShowAiPreporuka("2026-03-05", "dinner", beforeDeadline, workingHours), true);
    assert.equal(canShowAiPreporuka("2026-03-05", "dinner", afterDeadline, workingHours), false);
  });
});
