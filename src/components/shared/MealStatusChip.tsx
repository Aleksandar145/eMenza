"use client";

import Link from "next/link";
import type { MealType } from "@/lib/meal-types";
import type { MenuMealStatus } from "@/lib/kuhinja-menu-overview";
import { mealTypeShortLabels } from "@/lib/kuhinja-menu-overview";

const publishedChipClass =
  "bg-emerald-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]";

export function mealStatusChipClassForMeal(
  _mealType: MealType,
  status: MenuMealStatus,
  urgent: boolean,
) {
  if (status === "published") {
    return publishedChipClass;
  }

  if (urgent) {
    return "bg-red-500 text-white ring-1 ring-red-600/30";
  }

  switch (status) {
    case "draft_unsaved":
    case "draft":
      return "bg-amber-400 text-amber-950 ring-1 ring-amber-500/30";
    case "published_empty":
      return "bg-orange-300 text-orange-950 ring-1 ring-orange-400/30";
    case "missing":
    default:
      return "bg-black/10 text-black/45 ring-1 ring-black/10";
  }
}

type MealStatusChipProps = {
  mealType: MealType;
  status: MenuMealStatus;
  urgent?: boolean;
  selected?: boolean;
  href?: string;
};

export function MealStatusChip({
  mealType,
  status,
  urgent = false,
  selected = false,
  href,
}: MealStatusChipProps) {
  const className = selected
    ? "bg-white/20 text-white ring-1 ring-white/35"
    : mealStatusChipClassForMeal(mealType, status, urgent);

  const chipClassName = `inline-flex size-[18px] shrink-0 items-center justify-center rounded-md text-[9px] font-bold leading-none ${className}`;
  const label = mealTypeShortLabels[mealType];

  if (href) {
    return (
      <Link
        aria-label={`${label} — uredi jelovnik`}
        className={chipClassName}
        href={href}
        onClick={(event) => event.stopPropagation()}
        title={label}
      >
        {label}
      </Link>
    );
  }

  return (
    <span className={chipClassName} title={label}>
      {label}
    </span>
  );
}
