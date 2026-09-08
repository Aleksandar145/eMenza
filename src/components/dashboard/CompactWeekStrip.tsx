"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { usePlanningWeekDays } from "@/hooks/usePlanningWeekDays";
import { useHydrationSafeDateAnchor } from "@/hooks/useHydrationSafeDateAnchor";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import {
  formatCalendarDayLabel,
  getSuggestedObrokForDay,
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
import { getRezervacijeHref } from "@/lib/rezervacije-mock";
import { LiturgicalDayBadge } from "@/components/shared/LiturgicalDayBadge";
import { CalendarTodayLabel } from "@/components/shared/CalendarTodayLabel";
import { MealDayChips } from "@/components/shared/MealDayChips";
import type { UserReligion } from "@/lib/user-preferences";

type CompactWeekStripProps = {
  selectedDateKey: string;
  onSelectedDateChange: (dateKey: string) => void;
  religion?: UserReligion | "";
  fasting?: FastingPreferences;
  className?: string;
};

export function CompactWeekStrip({
  selectedDateKey,
  onSelectedDateChange,
  religion = "",
  fasting,
  className = "",
}: CompactWeekStripProps) {
  const { dateKey: anchorDateKey, mounted } = useHydrationSafeDateAnchor();
  const { state: adminState } = useAdminSystem();
  const { days } = usePlanningWeekDays(adminState.reservationAdvanceDays, anchorDateKey);

  if (!mounted) {
    return (
      <section
        className={`overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${className}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="text-[#5055D2]" size={18} />
            <h2 className="text-base font-bold text-black lg:text-lg">Naredna 4 dana</h2>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 p-3 lg:gap-3 lg:p-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="flex flex-col items-center rounded-2xl border border-black/5 bg-[#EFF1F4]/60 px-2 py-3"
              key={index}
            >
              <div className="h-3 w-8 animate-pulse rounded bg-black/10" />
              <div className="mt-2 h-6 w-6 animate-pulse rounded bg-black/10" />
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
      <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3 lg:px-5">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="text-[#5055D2]" size={18} />
          <h2 className="text-base font-bold text-black lg:text-lg">Naredna 4 dana</h2>
        </div>
        <Link
          className="text-xs font-semibold text-[#5055D2] transition-colors hover:underline lg:text-sm"
          href={getRezervacijeHref({
            dateKey: selectedDateKey,
            obrok: getSuggestedObrokForDay(selectedDateKey),
          })}
        >
          Planiraj obroke
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3 lg:gap-3 lg:p-4">
        {days.map((day) => {
          const isSelected = day.dateKey === selectedDateKey;
          const isToday = day.dateKey === anchorDateKey;
          const weekday = getWeekdayLabelForDateKey(day.dateKey).slice(0, 3);
          const showPosno =
            fasting !== undefined &&
            shouldShowPosnoMealsForDate(religion, day.dateKey, fasting);
          const liturgicalInfo = showPosno
            ? getLiturgicalDisplayInfo(religion, day.dateKey, fasting)
            : null;
          const tone = showPosno ? getLiturgicalDayTone(liturgicalInfo) : "default";

          return (
            <button
              aria-label={`${formatCalendarDayLabel(day.dateKey)}${isToday ? ", danas" : ""}`}
              aria-pressed={isSelected}
              className={`flex flex-col items-center rounded-2xl border px-2 py-3 transition-all ${getLiturgicalDayStripCellClasses({ tone, isSelected })} ${isToday ? getCalendarTodayOutlineClasses(isSelected) : ""}`}
              key={day.dateKey}
              onClick={() => onSelectedDateChange(day.dateKey)}
              type="button"
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${getLiturgicalDayStripWeekdayClasses({ isSelected })}`}
              >
                {weekday}
              </span>
              <span className="mt-1 text-xl font-bold tabular-nums leading-none">{day.day}</span>
              {isToday ? (
                <CalendarTodayLabel className="mt-0.5" compact isSelected={isSelected} />
              ) : null}
              <MealDayChips className="mt-2" isSelected={isSelected} meals={day.meals ?? []} />
              {liturgicalInfo?.shortLabel ? (
                <LiturgicalDayBadge compact className="mt-1.5" info={liturgicalInfo} selected={isSelected} />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default CompactWeekStrip;
