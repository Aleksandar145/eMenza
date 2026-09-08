import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_WORKING_HOURS } from "@/lib/admin-system-mock";
import { resolveEffectiveReservationStatus } from "@/lib/meal-reservation-status";

const workingHours = DEFAULT_WORKING_HOURS;

test("future reservation stays zakazano even if DB says aktivno", () => {
  const appNow = new Date("2026-06-23T12:30:00");
  const status = resolveEffectiveReservationStatus(
    "2026-06-25",
    "lunch",
    "aktivno",
    workingHours,
    appNow,
  );
  assert.equal(status, "zakazano");
});

test("today lunch in pickup window is aktivno", () => {
  const appNow = new Date("2026-06-23T12:30:00");
  const status = resolveEffectiveReservationStatus(
    "2026-06-23",
    "lunch",
    "zakazano",
    workingHours,
    appNow,
  );
  assert.equal(status, "aktivno");
});

test("today lunch outside pickup window is zakazano", () => {
  const appNow = new Date("2026-06-23T10:00:00");
  const status = resolveEffectiveReservationStatus(
    "2026-06-23",
    "lunch",
    "aktivno",
    workingHours,
    appNow,
  );
  assert.equal(status, "zakazano");
});

test("picked up status is unchanged", () => {
  const appNow = new Date("2026-06-23T12:30:00");
  const status = resolveEffectiveReservationStatus(
    "2026-06-23",
    "lunch",
    "iskorisceno",
    workingHours,
    appNow,
  );
  assert.equal(status, "iskorisceno");
});
