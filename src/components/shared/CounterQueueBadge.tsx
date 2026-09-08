"use client";

import { getQueueLevelConfig } from "@/lib/kitchen-counter-queue";
import { useCounterQueueStatus } from "@/hooks/useCounterQueueStatus";
import { useClientMounted } from "@/hooks/useClientMounted";
import type { MealType } from "@/lib/meal-types";

type CounterQueueBadgeProps = {
  dateKey: string;
  mealType: MealType;
  variant?: "compact" | "row" | "hero";
  className?: string;
};

export function CounterQueueBadge({
  dateKey,
  mealType,
  variant = "row",
  className = "",
}: CounterQueueBadgeProps) {
  const mounted = useClientMounted();
  const { level, label, isVisible } = useCounterQueueStatus({ dateKey, mealType });

  if (!mounted || !isVisible) {
    return null;
  }

  const config = getQueueLevelConfig(level);

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.chipClass} ${className}`}
        title={`Stanje u redu: ${label}`}
      >
        <span aria-hidden="true" className={`size-1.5 rounded-full ${config.dotClass}`} />
        {label}
      </span>
    );
  }

  if (variant === "hero") {
    return (
      <p
        className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.heroChipClass} ${className}`}
      >
        <span aria-hidden="true" className={`size-2 rounded-full ${config.dotClass}`} />
        Stanje u redu: {label}
      </p>
    );
  }

  return (
    <p
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${config.chipClass} ${className}`}
    >
      <span aria-hidden="true" className={`size-2.5 rounded-full ${config.dotClass}`} />
      Stanje u redu: {label}
    </p>
  );
}

export default CounterQueueBadge;
