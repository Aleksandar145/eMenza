"use client";

import { useState } from "react";
import { Ban, ClipboardCopy } from "lucide-react";
import { StaffBadge } from "@/components/staff";
import { getDishesByIds } from "@/lib/dish-catalog-store";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { kitchenSlotLabels, kitchenSlotOrder } from "@/lib/kuhinja-mock";
import type { DailyMenuSlot } from "@/lib/kuhinja-mock";
import { getMenuStatusLabel, mealTypeLabels } from "@/lib/kuhinja-menu-overview";
import { getBlockedDishesForMeal } from "@/lib/blocked-dishes-store";
import { KitchenWeeklyScheduleCellEditor } from "@/components/kuhinja/KitchenWeeklyScheduleCellEditor";
import type { WeeklySchedule, WeeklyScheduleMeal } from "@/lib/kuhinja-weekly-schedule";
import { weeklyScheduleMealTypes } from "@/lib/kuhinja-weekly-schedule";
import type { MealType } from "@/lib/meal-types";

type KitchenWeeklyScheduleGridProps = {
  schedule: WeeklySchedule;
  onUpdateMeal: (dateKey: string, mealType: MealType, slots: DailyMenuSlot[]) => void;
  onCopyDay?: (dateKey: string) => void;
  readOnly?: boolean;
};

type EditingCell = {
  dateKey: string;
  mealType: MealType;
  meal: WeeklyScheduleMeal;
};

function statusBadgeVariant(status: WeeklyScheduleMeal["status"]) {
  if (status === "published") {
    return "success" as const;
  }
  if (status === "missing") {
    return "neutral" as const;
  }
  return "warning" as const;
}

function MealCellContent({
  meal,
  dateKey,
  mealType,
}: {
  meal: WeeklyScheduleMeal;
  dateKey: string;
  mealType: MealType;
}) {
  const hasDishes = meal.slots.some((slot) => slot.dishIds.length > 0);

  if (!hasDishes) {
    return <p className="text-sm text-black/40">Nema jela</p>;
  }

  const blockedForMeal = getBlockedDishesForMeal(dateKey, mealType);
  const blockedIds = new Set(blockedForMeal.map((b) => b.dishId));
  const hasBlocked = blockedForMeal.length > 0;

  return (
    <div className="space-y-1.5">
      {hasBlocked ? (
        <div className="mb-1 flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 print:hidden">
          <Ban size={10} />
          Blokirano: {blockedForMeal.length}
        </div>
      ) : null}
      <ul className="space-y-1.5">
        {kitchenSlotOrder.map((slotId) => {
          const slot = meal.slots.find((entry) => entry.slotId === slotId);
          const dishes = getDishesByIds(slot?.dishIds ?? []);

          if (dishes.length === 0) {
            return null;
          }

          return (
            <li
              className={`rounded-lg px-2.5 py-1.5 print:px-0 print:py-0 ${
                slotId === "main"
                  ? "bg-[#5055D2]/10 print:bg-transparent"
                  : "bg-[#5055D2]/5 print:bg-transparent"
              }`}
              key={slotId}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5055D2] print:normal-case print:text-black/55">
                {kitchenSlotLabels[slotId]}
              </p>
              <ul className="mt-0.5">
                {dishes.map((dish) => {
                  const isBlocked = blockedIds.has(dish.id);
                  return (
                    <li
                      className={`flex items-center gap-1 text-sm font-medium leading-snug print:font-normal ${
                        isBlocked
                          ? "text-red-600 line-through"
                          : "text-black/85"
                      }`}
                      key={dish.id}
                    >
                      {dish.name}
                      {isBlocked ? (
                        <Ban size={10} className="shrink-0 text-red-400" />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function KitchenWeeklyScheduleGrid({
  schedule,
  onUpdateMeal,
  onCopyDay,
  readOnly = false,
}: KitchenWeeklyScheduleGridProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  return (
    <>
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-[110px] border border-black/10 bg-[#EFF1F4] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-black/55 print:bg-transparent print:px-2 print:py-2">
                Obrok
              </th>
              {schedule.days.map((day) => (
                <th
                  className="min-w-[120px] border border-black/10 bg-[#EFF1F4] px-3 py-2.5 print:bg-transparent print:px-2 print:py-2"
                  key={day.dateKey}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="block text-sm font-bold text-black">{day.weekdayLabel}</span>
                      <span className="mt-0.5 block text-xs font-normal text-black/45 print:text-black/60">
                        {formatCalendarDayLabel(day.dateKey)}
                      </span>
                    </div>
                    {onCopyDay && !readOnly ? (
                      <button
                        className="shrink-0 rounded-lg p-1 text-black/30 transition-colors hover:bg-black/5 hover:text-black/60 print:hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyDay(day.dateKey);
                        }}
                        title="Kopiraj dan sa prošle nedelje"
                        type="button"
                      >
                        <ClipboardCopy size={14} />
                      </button>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeklyScheduleMealTypes.map((mealType) => (
              <tr key={mealType}>
                <th className="border border-black/10 bg-[#EFF1F4]/60 px-3 py-3 align-top text-sm font-bold text-black print:bg-transparent print:px-2 print:py-2">
                  {mealTypeLabels[mealType]}
                </th>
                {schedule.days.map((day) => {
                  const meal = day.meals[mealType];

                  return (
                    <td className="border border-black/10 px-3 py-3 align-top print:px-2 print:py-2" key={day.dateKey}>
                      {readOnly ? (
                        <div className="w-full rounded-xl text-left">
                          <div className="mb-2 print:hidden">
                            <StaffBadge
                              label={getMenuStatusLabel(meal.status)}
                              variant={statusBadgeVariant(meal.status)}
                            />
                          </div>
                          <MealCellContent dateKey={day.dateKey} meal={meal} mealType={mealType} />
                        </div>
                      ) : (
                        <button
                          className="group w-full rounded-xl text-left transition-colors hover:bg-[#5055D2]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5055D2] print:pointer-events-none print:rounded-none print:hover:bg-transparent"
                          onClick={() => setEditingCell({ dateKey: day.dateKey, mealType, meal })}
                          type="button"
                        >
                          <div className="mb-2 print:hidden">
                            <StaffBadge
                              label={getMenuStatusLabel(meal.status)}
                              variant={statusBadgeVariant(meal.status)}
                            />
                          </div>
                          <MealCellContent dateKey={day.dateKey} meal={meal} mealType={mealType} />
                          <span className="mt-2 block text-xs font-semibold text-[#5055D2] opacity-0 transition-opacity group-hover:opacity-100 print:hidden">
                            Klikni za uređivanje
                          </span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingCell && !readOnly ? (
        <KitchenWeeklyScheduleCellEditor
          dateKey={editingCell.dateKey}
          isOpen
          meal={editingCell.meal}
          mealType={editingCell.mealType}
          onClose={() => setEditingCell(null)}
          onSave={(slots) => onUpdateMeal(editingCell.dateKey, editingCell.mealType, slots)}
        />
      ) : null}
    </>
  );
}

export default KitchenWeeklyScheduleGrid;
