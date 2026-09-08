"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { MealStatusChip } from "@/components/shared/MealStatusChip";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { getWeekdayLabelForDateKey } from "@/lib/calendar-utils";
import {
  formatWeekRangeLabel,
  getDayMenuOverview,
  getWeekDayKeys,
  getWeekStartForDate,
  isDateInReservationWindow,
  isDateInWeek,
  mealTypeLabels,
  shiftWeekStart,
} from "@/lib/kuhinja-menu-overview";
import type { WeeklySchedule } from "@/lib/kuhinja-weekly-schedule";
import type { MealType } from "@/lib/meal-types";

export type MealFilterType = MealType | "all";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];
const mealFilterOptions: MealFilterType[] = [...mealTypes, "all"];

const cardClass =
  "rounded-[20px] border border-black/5 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]";

type KitchenMenuWeekStripProps = {
  selectedDateKey: string;
  weekStartDateKey: string;
  onSelectedDateChange: (dateKey: string) => void;
  onWeekStartChange: (dateKey: string) => void;
  title?: string;
  selectedMealType?: MealFilterType;
  onMealTypeChange?: (mealType: MealFilterType) => void;
  schedule?: WeeklySchedule | null;
  children?: React.ReactNode;
};

export function KitchenMenuWeekStrip({
  selectedDateKey,
  weekStartDateKey,
  onSelectedDateChange,
  onWeekStartChange,
  title = "Nedeljni jelovnik",
  selectedMealType,
  onMealTypeChange,
  schedule,
  children,
}: KitchenMenuWeekStripProps) {
  const todayDateKey = useTodayDateKey();
  const showMealFilters = selectedMealType !== undefined && onMealTypeChange !== undefined;
  const dayKeys = getWeekDayKeys(weekStartDateKey);

  function handleSelectedDateChange(nextDateKey: string) {
    if (!isDateInWeek(nextDateKey, weekStartDateKey)) {
      onWeekStartChange(getWeekStartForDate(nextDateKey, todayDateKey));
    }
    onSelectedDateChange(nextDateKey);
  }

  function handleWeekStartChange(nextWeekStart: string) {
    onWeekStartChange(nextWeekStart);
    if (!isDateInWeek(selectedDateKey, nextWeekStart)) {
      const nextDayKeys = getWeekDayKeys(nextWeekStart);
      onSelectedDateChange(nextDayKeys[0] ?? selectedDateKey);
    }
  }

  return (
    <section className={`overflow-hidden ${cardClass}`}>
      <div className="border-b border-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="text-[#5055D2]" size={18} />
            <div>
              <h2 className="text-base font-bold text-black lg:text-lg">{title}</h2>
              <p className="text-xs text-black/45">{formatWeekRangeLabel(weekStartDateKey)}</p>
            </div>
            {children}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showMealFilters ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Obrok">
                {mealFilterOptions.map((filter) => (
                  <button
                    aria-pressed={selectedMealType === filter}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedMealType === filter
                        ? "bg-[#5055D2] text-white"
                        : "bg-black/5 text-black/70 hover:bg-black/10"
                    }`}
                    key={filter}
                    onClick={() => onMealTypeChange(filter)}
                    type="button"
                  >
                    {filter === "all" ? "Ceo dan" : mealTypeLabels[filter]}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              aria-label="Prethodna nedelja"
              className="rounded-full border border-black/10 p-2 hover:bg-black/5"
              onClick={() => handleWeekStartChange(shiftWeekStart(weekStartDateKey, -1))}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </button>
            <button
              aria-label="Sledeća nedelja"
              className="rounded-full border border-black/10 p-2 hover:bg-black/5"
              onClick={() => handleWeekStartChange(shiftWeekStart(weekStartDateKey, 1))}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="grid min-w-[560px] grid-cols-7 gap-2 p-3 lg:min-w-0 lg:gap-3 lg:p-4">
          {dayKeys.map((dateKey) => {
            const overview = getDayMenuOverview(dateKey);
            const scheduleDay = schedule?.days.find((day) => day.dateKey === dateKey);
            const isSelected = dateKey === selectedDateKey;
            const isToday = dateKey === todayDateKey;
            const weekday = getWeekdayLabelForDateKey(dateKey).slice(0, 3);
            const dayNumber = parseInt(dateKey.split("-")[2], 10);

            return (
              <button
                aria-label={`${formatCalendarDayLabel(dateKey)}${isToday ? ", danas" : ""}`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center rounded-2xl border px-1.5 py-2.5 transition-all lg:px-2 lg:py-3 ${
                  isSelected
                    ? "border-[#5055D2] bg-[#5055D2]/10 text-black ring-2 ring-[#5055D2]/25"
                    : "border-black/5 bg-[#EFF1F4]/60 text-black hover:border-[#5055D2]/25"
                } ${isToday && !isSelected ? "ring-2 ring-[#5055D2]/30 ring-offset-1" : ""}`}
                key={dateKey}
                onClick={() => handleSelectedDateChange(dateKey)}
                type="button"
              >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      isSelected ? "text-[#5055D2]/80" : "text-black/45"
                    }`}
                  >
                  {weekday}
                </span>
                <span className="mt-1 text-lg font-bold tabular-nums leading-none lg:text-xl">
                  {dayNumber}
                </span>
                <div className="mt-1.5 flex flex-wrap justify-center gap-0.5" aria-hidden="true">
                  {mealTypes.map((mealType) => {
                    const status = scheduleDay
                      ? scheduleDay.meals[mealType].status
                      : overview.meals[mealType].status;
                    const urgent =
                      isDateInReservationWindow(dateKey) && status !== "published";

                    return (
                      <MealStatusChip
                        key={mealType}
                        mealType={mealType}
                        status={status}
                        urgent={urgent}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-black/5 px-4 py-3 text-[11px] text-black/55 lg:px-5">
        <LegendDot className="bg-emerald-500" label="Objavljeno" />
        <LegendDot className="bg-amber-400" label="Draft" />
        <LegendDot className="bg-red-500" label="Hitno u prozoru" />
        <LegendDot className="bg-black/10" label="Nedostaje" />
      </div>
    </section>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

export default KitchenMenuWeekStrip;
