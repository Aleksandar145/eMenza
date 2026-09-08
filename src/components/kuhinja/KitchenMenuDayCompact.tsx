"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { StaffBadge } from "@/components/staff";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import {
  formatMealDishSummary,
  getDayMenuOverview,
  getJelovnikEditorHref,
  getMenuStatusLabel,
  mealTypeLabels,
} from "@/lib/kuhinja-menu-overview";
import type { MealType } from "@/lib/meal-types";
import { canEditKitchenMenu, normalizeKitchenStaffRole } from "@/lib/kuhinja-roles";

const cardClass =
  "rounded-[20px] border border-black/5 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];

type KitchenMenuDayCompactProps = {
  dateKey: string;
};

export function KitchenMenuDayCompact({ dateKey }: KitchenMenuDayCompactProps) {
  const { session } = useKuhinjaSessionContext();
  const canEdit = canEditKitchenMenu(normalizeKitchenStaffRole(session?.role));
  const overview = getDayMenuOverview(dateKey);

  return (
    <section className={`p-5 ${cardClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Izabrani dan</p>
      <h2 className="mt-1 text-lg font-bold text-black">{formatCalendarDayLabel(dateKey)}</h2>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {mealTypes.map((mealType) => {
          const meal = overview.meals[mealType];
          const needsAttention = meal.isInReservationWindow && meal.status !== "published";

          return (
            <article
              className={`rounded-2xl border p-4 transition-colors ${
                needsAttention
                  ? "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70"
                  : "border-black/5 bg-[#EFF1F4]/40 hover:bg-[#EFF1F4]/70"
              }`}
              key={mealType}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-black">{mealTypeLabels[mealType]}</h3>
                <StaffBadge
                  label={getMenuStatusLabel(meal.status)}
                  variant={
                    meal.status === "published"
                      ? "success"
                      : meal.status === "missing"
                        ? "neutral"
                        : "warning"
                  }
                />
              </div>

              <p className="mt-3 text-sm leading-relaxed text-black/80">
                {formatMealDishSummary(meal)}
              </p>

              {canEdit ? (
                <Link
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#5055D2] hover:underline"
                  href={getJelovnikEditorHref(dateKey, mealType)}
                >
                  Uredi jelovnik
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default KitchenMenuDayCompact;
