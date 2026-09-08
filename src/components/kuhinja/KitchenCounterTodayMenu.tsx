"use client";

import { UtensilsCrossed } from "lucide-react";
import { KitchenCounterCollapsibleSection } from "@/components/kuhinja/KitchenCounterCollapsibleSection";
import { StaffBadge } from "@/components/staff";
import { getMealPickupWindow } from "@/lib/dashboard-mock";
import type { KitchenMealClockState } from "@/lib/kitchen-meal-clock";
import {
  getMenuMealOverview,
  getMenuStatusLabel,
  mealTypeLabels,
  type MenuMealOverview,
} from "@/lib/kuhinja-menu-overview";
import { kitchenSlotOrder } from "@/lib/kuhinja-mock";
import type { MealType } from "@/lib/meal-types";

const MENU_STORAGE_KEY = "emenza-counter-panel-menu";

type KitchenCounterTodayMenuProps = {
  clock: KitchenMealClockState;
  dateKey: string;
};

function buildMenuMiniSummary(mealType: MealType, meal: MenuMealOverview): string {
  const dishNames = meal.slots.flatMap((slot) => slot.dishNames);
  const filledSlots = meal.slots.filter((slot) => slot.dishNames.length > 0).length;
  const statusLabel = getMenuStatusLabel(meal.status);

  if (dishNames.length === 0) {
    return `${mealTypeLabels[mealType]} · ${statusLabel} · nema jela`;
  }

  const dishesPreview = dishNames.join(", ");
  const truncated =
    dishesPreview.length > 40 ? `${dishesPreview.slice(0, 37).trimEnd()}…` : dishesPreview;

  return `${mealTypeLabels[mealType]} · ${statusLabel} · ${filledSlots} kategorije · ${truncated}`;
}

export function KitchenCounterTodayMenu({ clock, dateKey }: KitchenCounterTodayMenuProps) {
  if (!clock.menuMealType) {
    return null;
  }

  const mealType = clock.menuMealType;
  const meal = getMenuMealOverview(dateKey, mealType);
  const pickupWindow = getMealPickupWindow(dateKey, mealType);
  const slotMap = new Map(meal.slots.map((slot) => [slot.slotId, slot]));
  const title = clock.isUpcomingMenu ? "Meni za sledeći obrok" : "Meni danas";

  return (
    <KitchenCounterCollapsibleSection
      mini={buildMenuMiniSummary(mealType, meal)}
      storageKey={MENU_STORAGE_KEY}
      title={title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UtensilsCrossed aria-hidden="true" className="shrink-0 text-[#5055D2]" size={18} />
            <h2 className="text-base font-bold text-black">
              {title} — {mealTypeLabels[mealType]}
            </h2>
          </div>
          <p className="mt-1 text-sm text-black/55">
            Preuzimanje: {pickupWindow}
            {clock.isUpcomingMenu ? " · servis još nije počeo" : null}
          </p>
        </div>
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

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {kitchenSlotOrder.map((slotId) => {
          const slot = slotMap.get(slotId);
          const dishNames = slot?.dishNames ?? [];

          return (
            <div className="rounded-2xl border border-black/5 bg-[#EFF1F4]/50 px-4 py-3" key={slotId}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-black/45">
                {slot?.label ?? slotId}
              </dt>
              <dd className="mt-1.5 text-sm font-medium leading-relaxed text-black">
                {dishNames.length > 0 ? dishNames.join(", ") : "Nije popunjeno"}
              </dd>
            </div>
          );
        })}
      </dl>
    </KitchenCounterCollapsibleSection>
  );
}

export default KitchenCounterTodayMenu;
