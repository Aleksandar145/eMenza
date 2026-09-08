"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { usePlanningWeekDays } from "@/hooks/usePlanningWeekDays";
import { useHydrationSafeDateAnchor } from "@/hooks/useHydrationSafeDateAnchor";
import {
  formatCalendarDayLabel,
  getWeekdayLabelForDateKey,
} from "@/lib/dashboard-mock";
import { getLiturgicalDisplayInfo } from "@/lib/fasting-preferences";
import { shouldShowPosnoMealsForDate, type FastingPreferences } from "@/lib/fasting-preferences";
import {
  getLiturgicalDayStripCellClasses,
  getLiturgicalDayStripWeekdayClasses,
  getLiturgicalDayTone,
  getCalendarTodayOutlineClasses,
} from "@/lib/calendar-day-liturgical-styles";
import { LiturgicalDayBadge } from "@/components/shared/LiturgicalDayBadge";
import { CalendarTodayLabel } from "@/components/shared/CalendarTodayLabel";
import { MealDayChips } from "@/components/shared/MealDayChips";
import type { UserReligion } from "@/lib/user-preferences";
import { useT } from "@/i18n/useT";

type PlanningWeekStripProps = {
  selectedDateKey: string;
  onSelectedDateChange: (dateKey: string) => void;
  onReserve?: (dateKey: string) => void;
  religion?: UserReligion | "";
  fasting?: FastingPreferences;
  className?: string;
};

function WeekStripHeader({
  isFullCalendarOpen,
  onToggleCalendar,
}: {
  isFullCalendarOpen: boolean;
  onToggleCalendar: () => void;
}) {
  const { t } = useT();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3 lg:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <CalendarDays aria-hidden="true" className="shrink-0 text-[#5055D2]" size={18} />
        <h2 className="text-base font-bold text-black lg:text-lg">Plan obroka · 7 dana</h2>
      </div>
      <button
        aria-expanded={isFullCalendarOpen}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#5055D2]/20 bg-[#5055D2]/5 px-3 py-1.5 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10 lg:px-3.5 lg:text-sm"
        onClick={onToggleCalendar}
        type="button"
      >
        {isFullCalendarOpen ? t("reservations.hideFullCalendar") : t("reservations.showFullCalendar")}
        <ChevronDown
          aria-hidden="true"
          className={`transition-transform ${isFullCalendarOpen ? "rotate-180" : ""}`}
          size={16}
        />
      </button>
    </div>
  );
}

export function PlanningWeekStrip({
  selectedDateKey,
  onSelectedDateChange,
  onReserve,
  religion = "",
  fasting,
  className = "",
}: PlanningWeekStripProps) {
  const { dateKey: anchorDateKey, mounted } = useHydrationSafeDateAnchor();
  const { days, getDaySummary } = usePlanningWeekDays(7, anchorDateKey);
  const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);

  if (!mounted) {
    return (
      <section
        className={`overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${className}`}
      >
        <WeekStripHeader
          isFullCalendarOpen={isFullCalendarOpen}
          onToggleCalendar={() => setIsFullCalendarOpen((open) => !open)}
        />
        <div className="grid min-w-[560px] grid-cols-7 gap-2 p-3 lg:min-w-0 lg:gap-3 lg:p-4">
          {Array.from({ length: 7 }, (_, index) => (
            <div
              className="flex flex-col items-center rounded-2xl border border-black/5 bg-[#EFF1F4]/60 px-1.5 py-2.5 lg:px-2 lg:py-3"
              key={index}
            >
              <div className="h-3 w-8 animate-pulse rounded bg-black/10" />
              <div className="mt-2 h-6 w-6 animate-pulse rounded bg-black/10" />
              <div className="mt-2 h-4 w-10 animate-pulse rounded bg-black/8" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${className}`}
    >
      <WeekStripHeader
        isFullCalendarOpen={isFullCalendarOpen}
        onToggleCalendar={() => setIsFullCalendarOpen((open) => !open)}
      />

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="grid min-w-[560px] grid-cols-7 gap-2 p-3 lg:min-w-0 lg:gap-3 lg:p-4">
          {days.map((day) => {
            const isSelected = day.dateKey === selectedDateKey;
            const isToday = day.dateKey === anchorDateKey;
            const weekday = getWeekdayLabelForDateKey(day.dateKey).slice(0, 3);
            const summary = getDaySummary(day.dateKey);
            const isViewOnly = !day.isReservationAvailable;
            const showPosno =
              fasting !== undefined &&
              shouldShowPosnoMealsForDate(religion, day.dateKey, fasting);
            const liturgicalInfo = showPosno
              ? getLiturgicalDisplayInfo(religion, day.dateKey, fasting)
              : null;
            const tone = showPosno ? getLiturgicalDayTone(liturgicalInfo) : "default";

            return (
              <button
                aria-label={`${formatCalendarDayLabel(day.dateKey)}${isToday ? ", danas" : ""}${isViewOnly ? ", samo pregled" : ""}`}
                aria-pressed={isSelected}
                className={`flex flex-col items-center rounded-2xl border px-1.5 py-2.5 transition-all lg:px-2 lg:py-3 ${getLiturgicalDayStripCellClasses({ tone, isSelected, isViewOnly })} ${isToday ? getCalendarTodayOutlineClasses(isSelected || isViewOnly) : ""}`}
                key={day.dateKey}
                onClick={() => onSelectedDateChange(day.dateKey)}
                type="button"
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${getLiturgicalDayStripWeekdayClasses({ isSelected, isViewOnly })}`}
                >
                  {weekday}
                </span>
                <span className="mt-1 text-lg font-bold tabular-nums leading-none lg:text-xl">
                  {day.day}
                </span>
                {isToday ? (
                  <CalendarTodayLabel className="mt-0.5" compact isSelected={isSelected && !isViewOnly} />
                ) : null}
                <MealDayChips className="mt-1.5" isSelected={isSelected} meals={day.meals ?? []} />
                <span
                  className={`mt-1.5 text-[10px] font-semibold tabular-nums ${
                    isSelected ? (isViewOnly ? "text-black/45" : "text-white/75") : "text-black/40"
                  }`}
                >
                  {isViewOnly ? "Pregled" : `${summary.reserved}/${summary.total}`}
                </span>
                {liturgicalInfo?.shortLabel ? (
                  <LiturgicalDayBadge compact className="mt-1" info={liturgicalInfo} selected={isSelected && !isViewOnly} />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {isFullCalendarOpen ? (
        <div className="border-t border-black/5 p-3 lg:p-4">
          <DashboardCalendar
            compact
            fasting={fasting}
            onReserve={onReserve}
            onSelectedDateChange={onSelectedDateChange}
            religion={religion}
            selectedDateKey={selectedDateKey}
            variant="reservations"
          />
        </div>
      ) : null}
    </section>
  );
}

export default PlanningWeekStrip;
