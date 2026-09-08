"use client";

import { Clock } from "lucide-react";
import { useAppTime } from "@/contexts/AppTimeProvider";
import {
  canBookMealSlot,
  formatReservationBookByLabel,
} from "@/lib/meal-booking-window";
import type { MealReservationStatus } from "@/lib/dashboard-mock";
import type { MealType } from "@/lib/meal-types";

type ReservationBookByCountdownProps = {
  dateKey: string;
  mealType: MealType;
  status: MealReservationStatus;
  className?: string;
  variant?: "default" | "inline" | "hero" | "compact";
};

const variantClassName: Record<
  NonNullable<ReservationBookByCountdownProps["variant"]>,
  string
> = {
  default:
    "inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-900",
  inline: "text-sm font-medium text-amber-800/90",
  hero: "inline-flex items-center gap-1.5 text-sm font-medium text-white/90",
  compact: "mt-0.5 pl-3 text-[10px] font-medium tabular-nums lg:text-xs",
};

export function ReservationBookByCountdown({
  dateKey,
  mealType,
  status,
  className = "",
  variant = "default",
}: ReservationBookByCountdownProps) {
  const { now } = useAppTime();

  if (!canBookMealSlot(dateKey, mealType, status, now)) {
    return null;
  }

  const label = formatReservationBookByLabel(dateKey, mealType, status, now);
  if (!label) {
    return null;
  }

  const isCompact = variant === "compact";
  const isInline = variant === "inline";
  const Tag = isCompact || isInline ? "span" : "p";

  return (
    <Tag
      className={`${variantClassName[variant]} ${className} ${
        isCompact ? "text-amber-700/90" : ""
      } ${isInline ? "block" : ""}`}
    >
      {!isCompact && !isInline ? <Clock aria-hidden="true" size={15} /> : null}
      {isInline ? <Clock aria-hidden="true" className="mr-1 inline" size={13} /> : null}
      <span>{label}</span>
    </Tag>
  );
}

export default ReservationBookByCountdown;
