"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addMonths, compareDateKeys, formatCalendarDateLabel, parseDateKey } from "@/lib/calendar-utils";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useMealReservations } from "@/hooks/useMealReservations";
import {
  calendarTodayDate,
  formatMonthYearLabel,
  getAvailableCalendarDays,
  getMonthGrid,
  getWeekdayLabelForDateKey,
  isDayAvailableForReservation,
  mealLegend,
  type CalendarDayData,
  type MealType,
  weekdays,
} from "@/lib/dashboard-mock";
import { getLiturgicalDisplayInfo } from "@/lib/fasting-preferences";
import { shouldShowPosnoMealsForDate, type FastingPreferences } from "@/lib/fasting-preferences";
import {
  getLiturgicalDayMonthSelectedClasses,
  getLiturgicalDayTone,
  getCalendarTodayOutlineClasses,
} from "@/lib/calendar-day-liturgical-styles";
import { CalendarTodayLabel } from "@/components/shared/CalendarTodayLabel";
import { LiturgicalDayBadge } from "@/components/shared/LiturgicalDayBadge";
import { MealDayChips } from "@/components/shared/MealDayChips";
import { hasBookableMealSlotOnDay } from "@/lib/meal-booking-window";
import { getClosedDateEntryForDate } from "@/lib/admin-system-store";
import {
  getHistoryMealTypesForDate,
  getReservedMealTypesForDate,
} from "@/lib/reservations-view";
import type { UserReligion } from "@/lib/user-preferences";

type ViewMode = "month" | "available";

type DashboardCalendarVariant = "default" | "reservations";

type DashboardCalendarProps = {
  className?: string;
  compact?: boolean;
  variant?: DashboardCalendarVariant;
  selectedDateKey: string;
  onSelectedDateChange: (dateKey: string) => void;
  onReserve?: (dateKey: string) => void;
  religion?: UserReligion | "";
  fasting?: FastingPreferences;
};

const mealAccentClass: Record<MealType, string> = {
  breakfast: "bg-[var(--meal-breakfast)]",
  lunch: "bg-[var(--meal-lunch)]",
  dinner: "bg-[var(--meal-dinner)]",
};

function CalendarDayCell({
  day,
  compact,
  isSelected,
  isToday,
  isPastDate,
  isDimmed,
  isFilterMatch,
  isUnavailable,
  closedReason,
  onSelect,
  onReserve,
  religion = "",
  fasting,
}: {
  day: CalendarDayData;
  compact: boolean;
  isSelected: boolean;
  isToday: boolean;
  isPastDate: boolean;
  isDimmed: boolean;
  isFilterMatch: boolean;
  isUnavailable: boolean;
  closedReason?: string;
  onSelect: () => void;
  onReserve?: (dateKey: string) => void;
  religion?: UserReligion | "";
  fasting?: FastingPreferences;
}) {
  const router = useRouter();
  const mealCount = day.meals?.length ?? 0;
  const hasMeals = mealCount > 0;
  const isOutsideMonth = Boolean(day.outsideMonth);
  const canReserve =
    !isOutsideMonth &&
    !isPastDate &&
    hasBookableMealSlotOnDay(day.dateKey, day.meals ?? []);
  const dateLabel = formatCalendarDateLabel(day.dateKey);
  const showPosno = fasting
    ? shouldShowPosnoMealsForDate(religion, day.dateKey, fasting)
    : false;
  const liturgicalInfo = showPosno && fasting
    ? getLiturgicalDisplayInfo(religion, day.dateKey, fasting)
    : null;
  const tone = showPosno ? getLiturgicalDayTone(liturgicalInfo) : "default";
  const sizeClass = compact
    ? "min-h-[50px] text-sm lg:min-h-[54px]"
    : "min-h-[54px] text-base lg:min-h-[58px]";

  const todayRing =
    isToday && !isUnavailable
      ? getCalendarTodayOutlineClasses(isSelected, "ring-offset-[#EFF1F4]")
      : "";

  let cellBackground = "";
  if (isUnavailable && !closedReason) {
    cellBackground = "cursor-not-allowed bg-black/[0.03] opacity-40";
  } else if (closedReason) {
    cellBackground = "cursor-pointer bg-red-50";
  } else if (isSelected) {
    cellBackground = getLiturgicalDayMonthSelectedClasses(tone);
  } else if (isToday) {
    cellBackground = "bg-[#5055D2]/12 shadow-[0_1px_4px_rgba(80,85,210,0.12)]";
  } else if (isPastDate) {
    cellBackground = hasMeals
      ? "bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-white"
      : "bg-black/[0.02] hover:bg-white/60";
  } else if (isFilterMatch) {
    cellBackground =
      "bg-white ring-2 ring-[#5055D2]/35 shadow-[0_1px_6px_rgba(80,85,210,0.15)]";
  } else if (hasMeals) {
    cellBackground =
      "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]";
  } else if (canReserve) {
    if (isOutsideMonth) {
      cellBackground = "bg-transparent hover:bg-white/60";
    } else {
      cellBackground = "bg-transparent hover:bg-white/80";
    }
  } else {
    cellBackground = "bg-transparent";
  }

  const weekendTint =
    day.weekend &&
    !isSelected &&
    !isToday &&
    !isFilterMatch &&
    !isUnavailable &&
    !isOutsideMonth &&
    tone === "default"
      ? "bg-[#b45309]/[0.06]"
      : "";

  return (
    <div className="group relative">
      <button
        aria-disabled={isUnavailable && !closedReason}
        aria-label={`${dateLabel}${isToday ? ", danas" : ""}${isPastDate ? ", istorija" : ""}${isUnavailable ? ", nedostupno za rezervaciju" : ""}${hasMeals ? `, ${mealCount} rezervisano` : ""}${isSelected ? ", izabrano" : ""}`}
        aria-pressed={isSelected}
        className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-xl transition-all ${sizeClass} ${todayRing} ${cellBackground} ${weekendTint} ${isOutsideMonth && !isUnavailable ? "opacity-60" : ""} ${isDimmed ? "opacity-35" : ""}`}
        disabled={isUnavailable && !closedReason}
        onClick={closedReason ? () => router.push("/obavestenja") : isUnavailable ? undefined : onSelect}
        type="button"
      >
        <span
          className={
            closedReason
              ? "font-bold tabular-nums text-red-600"
              : isUnavailable
                ? "font-medium tabular-nums text-black/30 line-through decoration-black/20"
                : isSelected
                ? "font-bold tabular-nums text-white"
                : isToday
                  ? "font-bold tabular-nums text-[#5055D2]"
                : isPastDate
                  ? "font-medium tabular-nums text-black/50"
                  : isOutsideMonth
                    ? "font-medium tabular-nums text-black/35"
                    : day.weekend
                      ? "font-semibold tabular-nums text-[#b45309]"
                      : "font-medium tabular-nums text-black/70"
          }
        >
          {day.day}
        </span>

        {closedReason ? (
          <span className="whitespace-nowrap text-[8px] font-bold uppercase leading-tight text-red-500 lg:text-[9px]">
            Menza ne radi
          </span>
        ) : null}

        {isToday ? (
          <CalendarTodayLabel compact isSelected={isSelected} />
        ) : null}

        {hasMeals && !isUnavailable ? (
          <MealDayChips isSelected={isSelected} meals={day.meals!} variant="calendar" />
        ) : (
          <span aria-hidden="true" className="h-[18px]" />
        )}
        {liturgicalInfo?.shortLabel ? (
          <LiturgicalDayBadge
            compact
            className="max-w-full truncate"
            info={liturgicalInfo}
            selected={isSelected}
          />
        ) : null}
      </button>

      {canReserve && onReserve ? (
        <button
          aria-label={`Rezerviši obrok za ${dateLabel}`}
          className="absolute inset-x-1 bottom-1 z-10 flex items-center justify-center gap-0.5 rounded-md bg-[#5055D2] px-1 py-0.5 text-[9px] font-semibold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 lg:text-[10px]"
          onClick={() => onReserve(day.dateKey)}
          type="button"
        >
          <Plus aria-hidden="true" size={10} />
          Rezerviši
        </button>
      ) : null}
    </div>
  );
}

export function DashboardCalendar({
  className = "",
  compact = false,
  variant = "default",
  selectedDateKey,
  onSelectedDateChange,
  onReserve,
  religion = "",
  fasting,
}: DashboardCalendarProps) {
  const todayDateKey = useTodayDateKey();
  const isReservationsVariant = variant === "reservations";
  const { reservations, usesBackend } = useMealReservations();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [mealFilter, setMealFilter] = useState<MealType | null>(null);
  const initialMonth = parseDateKey(todayDateKey) ?? calendarTodayDate;
  const [displayMonth, setDisplayMonth] = useState({
    year: initialMonth.year,
    month: initialMonth.month,
  });

  const availableDays = useMemo(() => getAvailableCalendarDays(), []);

  const mergeReservedMeals = useCallback(
    (days: CalendarDayData[]) => {
      if (!usesBackend) {
        return days;
      }

      const getMeals = isReservationsVariant
        ? (dateKey: string) => getHistoryMealTypesForDate(dateKey, reservations)
        : (dateKey: string) => getReservedMealTypesForDate(dateKey, reservations);

      return days.map((day) => ({
        ...day,
        meals: getMeals(day.dateKey),
      }));
    },
    [isReservationsVariant, reservations, usesBackend],
  );

  const monthGrid = useMemo(
    () =>
      mergeReservedMeals(getMonthGrid(displayMonth.year, displayMonth.month)),
    [displayMonth.month, displayMonth.year, mergeReservedMeals],
  );

  const visibleDays = viewMode === "available" ? mergeReservedMeals(availableDays) : monthGrid;
  const gridColumnsClass = viewMode === "available" ? "grid-cols-4" : "grid-cols-7";
  const monthLabel = formatMonthYearLabel(displayMonth.year, displayMonth.month);

  function toggleMealFilter(type: MealType) {
    setMealFilter((current) => (current === type ? null : type));
  }

  function handleSelectDay(day: CalendarDayData) {
    if (day.outsideMonth) {
      const parsed = parseDateKey(day.dateKey);
      if (parsed) {
        setDisplayMonth({ year: parsed.year, month: parsed.month });
      }
    }

    onSelectedDateChange(day.dateKey);
  }

  function handlePrevMonth() {
    const previous = addMonths(
      { year: displayMonth.year, month: displayMonth.month, day: 1 },
      -1,
    );
    setDisplayMonth({ year: previous.year, month: previous.month });
  }

  function handleNextMonth() {
    const next = addMonths(
      { year: displayMonth.year, month: displayMonth.month, day: 1 },
      1,
    );
    setDisplayMonth({ year: next.year, month: next.month });
  }

  function switchView(mode: ViewMode) {
    setViewMode(mode);

    if (mode === "available") {
      const isInWindow = availableDays.some((day) => day.dateKey === selectedDateKey);
      if (!isInWindow) {
        onSelectedDateChange(todayDateKey);
      }
      return;
    }

    const selected = parseDateKey(selectedDateKey);
    if (selected) {
      setDisplayMonth({ year: selected.year, month: selected.month });
    }
  }

  return (
    <section
      className={`card-light flex flex-col overflow-hidden rounded-[20px] ${className}`}
    >
      <div
        className={`flex flex-wrap items-start justify-between gap-3 border-b border-black/5 ${
          compact ? "px-4 py-3 lg:px-5" : "px-5 py-4 lg:px-6 lg:py-5"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
            <CalendarDays aria-hidden="true" className="text-[#5055D2]" size={20} />
          </div>
          <div>
            <h2
              className={`font-bold text-black ${
                compact ? "text-lg lg:text-xl" : "text-xl lg:text-2xl"
              }`}
            >
              Kalendar
            </h2>
            <p className="mt-0.5 text-xs font-light text-black/55 lg:text-sm">
              {isReservationsVariant
                ? "Pregledajte istoriju i planirajte rezervacije"
                : viewMode === "available"
                  ? "Danas i naredna 3 dana dostupna za rezervaciju"
                  : "Rezervacija moguća samo za danas i naredna 3 dana"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isReservationsVariant ? (
          <div className="flex rounded-full border border-black/5 bg-white p-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <button
              aria-pressed={viewMode === "month"}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors lg:text-sm ${
                viewMode === "month"
                  ? "bg-[#5055D2] text-white"
                  : "text-black/55 hover:text-[#5055D2]"
              }`}
              onClick={() => switchView("month")}
              type="button"
            >
              Mesec
            </button>
            <button
              aria-pressed={viewMode === "available"}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors lg:text-sm ${
                viewMode === "available"
                  ? "bg-[#5055D2] text-white"
                  : "text-black/55 hover:text-[#5055D2]"
              }`}
              onClick={() => switchView("available")}
              type="button"
            >
              Dostupno
            </button>
          </div>
          ) : null}

          {viewMode === "month" || isReservationsVariant ? (
            <div className="flex items-center gap-0.5 rounded-full border border-black/5 bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <button
                aria-label="Prethodni mesec"
                className="flex size-8 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2]"
                onClick={handlePrevMonth}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <span className="min-w-[5.5rem] px-2 text-center text-sm font-bold text-[#5055D2] lg:min-w-[6.5rem] lg:text-base">
                {monthLabel}
              </span>
              <button
                aria-label="Sledeći mesec"
                className="flex size-8 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2]"
                onClick={handleNextMonth}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
          ) : (
            <span className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-xs font-semibold text-[#5055D2] shadow-[0_1px_4px_rgba(0,0,0,0.06)] lg:text-sm">
              {formatCalendarDateLabel(availableDays[0]?.dateKey ?? todayDateKey)} –{" "}
              {formatCalendarDateLabel(
                availableDays.at(-1)?.dateKey ?? todayDateKey,
              )}
            </span>
          )}
        </div>
      </div>

      <div className={compact ? "flex flex-1 flex-col p-4 lg:p-5" : "flex flex-1 flex-col p-5 lg:p-6"}>
        <div className="flex-1 rounded-2xl bg-[#EFF1F4]/80 p-2.5 lg:p-3">
          <div className={`grid ${gridColumnsClass} gap-1 lg:gap-1.5 ${compact ? "mb-1" : "mb-1.5"}`}>
            {viewMode === "available"
              ? visibleDays.map((day) => (
                  <span
                    className={`rounded-lg py-1 text-center text-[10px] font-semibold uppercase tracking-wide lg:text-xs ${
                      day.weekend ? "bg-[#b45309]/10 text-[#b45309]/90" : "text-black/45"
                    }`}
                    key={`header-${day.dateKey}`}
                  >
                    {getWeekdayLabelForDateKey(day.dateKey)}
                  </span>
                ))
              : weekdays.map((day, colIndex) => (
                  <span
                    className={`rounded-lg py-1 text-center text-[10px] font-semibold uppercase tracking-wide lg:text-xs ${
                      colIndex >= 5
                        ? "bg-[#b45309]/10 text-[#b45309]/90"
                        : "text-black/45"
                    }`}
                    key={day.label}
                  >
                    {day.label}
                  </span>
                ))}
          </div>

          <div className={`grid ${gridColumnsClass} gap-1 lg:gap-1.5`}>
            {visibleDays.map((day) => {
              const isSelected = day.dateKey === selectedDateKey;
              const isFilterMatch = Boolean(
                mealFilter && day.meals?.includes(mealFilter),
              );
              const isDimmed = Boolean(
                mealFilter &&
                  (!day.meals || !day.meals.includes(mealFilter)),
              );
              const isToday = day.dateKey === todayDateKey;
              const isPastDate =
                isReservationsVariant && compareDateKeys(day.dateKey, todayDateKey) < 0;
              const isUnavailable = isReservationsVariant
                ? !isPastDate && !isDayAvailableForReservation(day.dateKey)
                : !isDayAvailableForReservation(day.dateKey);

              const closedEntry = isUnavailable ? getClosedDateEntryForDate(day.dateKey) : undefined;

              return (
                <CalendarDayCell
                  closedReason={closedEntry?.reason}
                  compact={compact}
                  day={day}
                  fasting={fasting}
                  isDimmed={isDimmed}
                  isFilterMatch={isFilterMatch}
                  isPastDate={isPastDate}
                  isSelected={isSelected}
                  isToday={isToday}
                  isUnavailable={isUnavailable}
                  key={day.dateKey}
                  onReserve={onReserve}
                  onSelect={() => handleSelectDay(day)}
                  religion={religion}
                />
              );
            })}
          </div>
        </div>

        <div
          className={`flex flex-wrap items-center gap-2 ${
            compact ? "mt-3 pt-1" : "mt-4 pt-2"
          }`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40 lg:text-xs">
            Filter:
          </span>
          {mealLegend.map((item) => {
            const isActive = mealFilter === item.type;

            return (
              <button
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors lg:text-sm ${
                  isActive
                    ? "border-[#5055D2]/30 bg-[#5055D2]/10 text-[#5055D2]"
                    : "border-black/5 bg-white text-black/70 hover:border-[#5055D2]/20 hover:text-[#5055D2]"
                }`}
                key={item.label}
                onClick={() => toggleMealFilter(item.type)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${mealAccentClass[item.type]}`}
                />
                {item.label}
              </button>
            );
          })}
          {mealFilter ? (
            <button
              className="text-xs font-medium text-[#5055D2] underline-offset-2 hover:underline"
              onClick={() => setMealFilter(null)}
              type="button"
            >
              Poništi filter
            </button>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-black/45 lg:text-xs">
              <span className="size-3 rounded-md bg-[#5055D2]/15 ring-2 ring-[#5055D2] ring-offset-1 ring-offset-white" />
              Danas
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-black/45 lg:text-xs">
              <span className="size-3 rounded-md bg-black/[0.06] opacity-40 ring-1 ring-black/10 ring-offset-1 ring-offset-white" />
              {isReservationsVariant ? "Van prozora" : "Nedostupno"}
            </span>
            {isReservationsVariant ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-black/45 lg:text-xs">
                <span className="size-3 rounded-md bg-black/[0.04] ring-1 ring-black/10 ring-offset-1 ring-offset-white" />
                Istorija
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardCalendar;
