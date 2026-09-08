"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  buildMonthGrid,
  compareDateKeys,
  formatCalendarDateLabel,
  formatMonthYearLabel,
  parseDateKey,
} from "@/lib/calendar-utils";
import { weekdays } from "@/lib/dashboard-mock";
import { useT } from "@/i18n/useT";
import { statsGlassOnDark } from "@/components/statistika/statistics-ui";

const EMPTY_RESERVATIONS = {};

type StatisticsDatePickerProps = {
  anchorDateKey: string;
  maxDateKey: string;
  onAnchorDateChange: (dateKey: string) => void;
};

function canGoToNextMonth(viewYear: number, viewMonth: number, maxDateKey: string) {
  const maxDate = parseDateKey(maxDateKey);
  if (!maxDate) {
    return false;
  }

  if (viewYear < maxDate.year) {
    return true;
  }

  return viewYear === maxDate.year && viewMonth < maxDate.month;
}

export function StatisticsDatePicker({
  anchorDateKey,
  maxDateKey,
  onAnchorDateChange,
}: StatisticsDatePickerProps) {
  const { t } = useT();
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const anchorDate = parseDateKey(anchorDateKey);
  const initialView = anchorDate ?? parseDateKey(maxDateKey) ?? { year: 2026, month: 1, day: 1 };
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);

  const monthGrid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth, EMPTY_RESERVATIONS),
    [viewMonth, viewYear],
  );

  const selectedLabel = formatCalendarDateLabel(anchorDateKey);
  const showNextMonth = canGoToNextMonth(viewYear, viewMonth, maxDateKey);
  const isTodaySelected = anchorDateKey === maxDateKey;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const anchor = parseDateKey(anchorDateKey);
    if (anchor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewYear(anchor.year);
      setViewMonth(anchor.month);
    }
  }, [anchorDateKey, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelectDate(dateKey: string) {
    if (compareDateKeys(dateKey, maxDateKey) > 0) {
      return;
    }

    onAnchorDateChange(dateKey);
    setIsOpen(false);
  }

  function handlePreviousMonth() {
    const previous = addMonths({ year: viewYear, month: viewMonth, day: 1 }, -1);
    setViewYear(previous.year);
    setViewMonth(previous.month);
  }

  function handleNextMonth() {
    if (!showNextMonth) {
      return;
    }

    const next = addMonths({ year: viewYear, month: viewMonth, day: 1 }, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t("statistics.pickDate")}
        className={`inline-flex size-9 items-center justify-center rounded-full text-white transition-all hover:bg-white/20 ${statsGlassOnDark} ${isOpen ? "bg-white/20 ring-2 ring-white/30" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <CalendarDays aria-hidden="true" size={17} />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(100vw-2rem,320px)] origin-top-right transition-all duration-200 ease-out"
          id={popoverId}
          role="dialog"
          aria-label={t("statistics.pickDateTitle")}
        >
          <div className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.04]">
            <div className="bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#9093E1] px-4 py-3.5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
                {t("statistics.pickDateTitle")}
              </p>
              <p className="mt-1 text-base font-bold tracking-tight">{selectedLabel}</p>
            </div>

            <div className="p-3.5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  aria-label={t("statistics.periodPrevious")}
                  className="inline-flex size-8 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-[#5055D2]/8 hover:text-[#5055D2]"
                  onClick={handlePreviousMonth}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={18} />
                </button>

                <p className="text-sm font-bold tracking-tight text-black">
                  {formatMonthYearLabel(viewYear, viewMonth)}
                </p>

                <button
                  aria-label={t("statistics.periodNext")}
                  className="inline-flex size-8 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-[#5055D2]/8 hover:text-[#5055D2] disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={!showNextMonth}
                  onClick={handleNextMonth}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" size={18} />
                </button>
              </div>

              <div className="mb-1.5 grid grid-cols-7 gap-1">
                {weekdays.map((weekday) => (
                  <div
                    aria-hidden="true"
                    className={`py-1 text-center text-[10px] font-semibold uppercase tracking-wide ${
                      weekday.weekend ? "text-[#b45309]/80" : "text-black/40"
                    }`}
                    key={weekday.label}
                  >
                    {weekday.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((day) => {
                  const isSelected = day.dateKey === anchorDateKey;
                  const isToday = day.dateKey === maxDateKey;
                  const isFuture = compareDateKeys(day.dateKey, maxDateKey) > 0;
                  const isDisabled = day.outsideMonth || isFuture;

                  let cellClass =
                    "relative flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-all";
                  if (isDisabled) {
                    cellClass += " cursor-not-allowed text-black/20";
                  } else if (isSelected) {
                    cellClass +=
                      " bg-gradient-to-br from-[#5055D2] to-[#6368e0] font-bold text-white shadow-[0_4px_12px_rgba(80,85,210,0.35)]";
                  } else if (isToday) {
                    cellClass +=
                      " bg-[#5055D2]/10 font-bold text-[#5055D2] ring-1 ring-[#5055D2]/25 hover:bg-[#5055D2]/16";
                  } else if (day.weekend) {
                    cellClass += " text-[#b45309] hover:bg-[#b45309]/8";
                  } else {
                    cellClass += " text-black/75 hover:bg-[#5055D2]/8 hover:text-[#5055D2]";
                  }

                  if (day.outsideMonth && !isFuture) {
                    cellClass += " opacity-45";
                  }

                  return (
                    <button
                      aria-label={formatCalendarDateLabel(day.dateKey)}
                      aria-pressed={isSelected}
                      className={cellClass}
                      disabled={isDisabled}
                      key={day.dateKey}
                      onClick={() => handleSelectDate(day.dateKey)}
                      type="button"
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-3">
                <p className="text-xs text-black/45">{t("statistics.pickDateHint")}</p>
                <button
                  className="rounded-full bg-[#5055D2]/10 px-3 py-1.5 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/16 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isTodaySelected}
                  onClick={() => handleSelectDate(maxDateKey)}
                  type="button"
                >
                  {t("statistics.goToToday")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StatisticsDatePicker;
