"use client";

import { Clock } from "lucide-react";
import { KitchenCounterCollapsibleSection } from "@/components/kuhinja/KitchenCounterCollapsibleSection";
import { formatCountdown, type KitchenMealClockState } from "@/lib/kitchen-meal-clock";

const STATUS_STORAGE_KEY = "emenza-counter-panel-status";

type KitchenCounterStatusBarProps = {
  clock: KitchenMealClockState;
};

function buildStatusMiniSummary(clock: KitchenMealClockState): string {
  const parts = [clock.dateLabel];

  if (clock.isServing) {
    parts.push(clock.phaseLabel);
  } else if (clock.mealLabel) {
    parts.push(clock.mealLabel);
  }

  parts.push(clock.currentTime);

  if (clock.countdown && clock.countdownMode === "serving_end") {
    parts.push(`završava za ${formatCountdown(clock.countdown)}`);
  } else if (clock.countdown && clock.countdownMode === "next_start") {
    parts.push(`počinje za ${formatCountdown(clock.countdown)}`);
  } else if (clock.countdownMode === "none") {
    parts.push(clock.countdownPrefix);
  }

  return parts.filter(Boolean).join(" · ");
}

export function KitchenCounterStatusBar({ clock }: KitchenCounterStatusBarProps) {
  return (
    <KitchenCounterCollapsibleSection
      mini={buildStatusMiniSummary(clock)}
      storageKey={STATUS_STORAGE_KEY}
      title="Danas"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-black/55">
            Danas je <span className="font-semibold text-black">{clock.dateLabel}</span>
            {clock.isServing ? (
              <>
                {" "}
                — vreme je{" "}
                <span className="font-semibold text-[#5055D2]">{clock.phaseLabel}</span>
              </>
            ) : null}
          </p>
          {clock.countdownMode === "none" ? (
            <p className="mt-1 text-sm font-medium text-black/70">{clock.countdownPrefix}</p>
          ) : null}
        </div>

        <div className="text-right">
          <p className="font-mono text-2xl font-bold tabular-nums text-black">{clock.currentTime}</p>
          {clock.countdown && clock.countdownMode === "serving_end" ? (
            <p className="mt-1 inline-flex items-center justify-end gap-1.5 text-sm text-black/55">
              <Clock aria-hidden="true" size={14} />
              <span>
                {clock.countdownPrefix}{" "}
                <span className="font-mono font-semibold tabular-nums text-black">
                  {formatCountdown(clock.countdown)}
                </span>
              </span>
            </p>
          ) : null}
          {clock.countdown && clock.countdownMode === "next_start" ? (
            <p className="mt-1 inline-flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-sm text-black/55">
              <Clock aria-hidden="true" size={14} />
              <span>
                {clock.countdownPrefix}{" "}
                <span className="font-mono font-semibold tabular-nums text-black">
                  {formatCountdown(clock.countdown)}
                </span>{" "}
                (
                <span className="font-semibold text-[#5055D2]">{clock.mealLabel}</span>
                )
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </KitchenCounterCollapsibleSection>
  );
}

export default KitchenCounterStatusBar;
