"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  buildMonthGrid,
  compareDateKeys,
  formatCalendarDateLabel,
  parseDateKey,
} from "@/lib/calendar-utils";
import { weekdays } from "@/lib/dashboard-mock";

type AdminDatePickerProps = {
  value: string;
  max: string;
  onChange: (dateKey: string) => void;
};

const EMPTY = {};

const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

function getMaxDate(dateKey: string) {
  const d = parseDateKey(dateKey);
  return d ?? { year: 2026, month: 1, day: 1 };
}

const START_YEAR = 2024;

export function AdminDatePicker({ value, max, onChange }: AdminDatePickerProps) {
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const maxDate = getMaxDate(max);
  const initial = parseDateKey(value) ?? maxDate;
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth, EMPTY), [viewMonth, viewYear]);

  const selectedLabel = formatCalendarDateLabel(value);
  const isToday = value === max;

  const years = useMemo(() => {
    const y: number[] = [];
    for (let yv = START_YEAR; yv <= maxDate.year; yv++) y.push(yv);
    return y;
  }, [maxDate.year]);

  useEffect(() => {
    if (!open) return;
    const anchor = parseDateKey(value);
    if (anchor) {
      setViewYear(anchor.year);
      setViewMonth(anchor.month);
    }
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(dateKey: string) {
    if (compareDateKeys(dateKey, max) > 0) return;
    onChange(dateKey);
    setOpen(false);
  }

  function setView(month: number, year: number) {
    const clampedMonth = year >= maxDate.year ? Math.min(month, maxDate.month) : month;
    setViewMonth(clampedMonth);
    setViewYear(Math.min(year, maxDate.year));
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex size-9 items-center justify-center rounded-full border transition-all ${
          open
            ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
            : "border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/30 hover:text-[var(--text-secondary)]"
        }`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <CalendarDays size={17} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(100vw-2rem,320px)]"
          id={popoverId}
          role="dialog"
        >
          <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-white shadow-lg ring-1 ring-black/[0.04]">
            <div className="bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#9093E1] px-4 py-3.5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">
                Izaberi datum
              </p>
              <p className="mt-1 text-base font-bold tracking-tight">{selectedLabel}</p>
            </div>

            <div className="p-3.5">
              <div className="mb-3 flex items-center gap-2">
                <select
                  className="flex-1 rounded-lg border border-[var(--card-border)] bg-white px-2 py-1.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#5055D2]/30"
                  value={viewMonth}
                  onChange={(e) => setView(Number(e.target.value), viewYear)}
                >
                  {MONTHS.map((name, idx) => {
                    const m = idx + 1;
                    const disabled = viewYear >= maxDate.year && m > maxDate.month;
                    return (
                      <option disabled={disabled} key={m} value={m}>
                        {name}
                      </option>
                    );
                  })}
                </select>

                <select
                  className="rounded-lg border border-[var(--card-border)] bg-white px-2 py-1.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#5055D2]/30"
                  value={viewYear}
                  onChange={(e) => setView(viewMonth, Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-1.5 grid grid-cols-7 gap-1">
                {weekdays.map((wd) => (
                  <div
                    aria-hidden="true"
                    className={`py-1 text-center text-[10px] font-semibold uppercase tracking-wide ${
                      wd.weekend ? "text-[#b45309]/80" : "text-[var(--text-muted)]"
                    }`}
                    key={wd.label}
                  >
                    {wd.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((day) => {
                  const sel = day.dateKey === value;
                  const today = day.dateKey === max;
                  const future = compareDateKeys(day.dateKey, max) > 0;
                  const disabled = day.outsideMonth || future;

                  let cell =
                    "relative flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-all";
                  if (disabled) {
                    cell += " cursor-not-allowed text-black/20";
                  } else if (sel) {
                    cell +=
                      " bg-gradient-to-br from-[#5055D2] to-[#6368e0] font-bold text-white shadow-[0_4px_12px_rgba(80,85,210,0.35)]";
                  } else if (today) {
                    cell +=
                      " bg-[#5055D2]/10 font-bold text-[#5055D2] ring-1 ring-[#5055D2]/25 hover:bg-[#5055D2]/16";
                  } else if (day.weekend) {
                    cell += " text-[#b45309] hover:bg-[#b45309]/8";
                  } else {
                    cell += " text-[var(--text-primary)] hover:bg-[#5055D2]/8 hover:text-[#5055D2]";
                  }

                  if (day.outsideMonth && !future) cell += " opacity-45";

                  return (
                    <button
                      aria-label={formatCalendarDateLabel(day.dateKey)}
                      aria-pressed={sel}
                      className={cell}
                      disabled={disabled}
                      key={day.dateKey}
                      onClick={() => handleSelect(day.dateKey)}
                      type="button"
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--card-border)] pt-3">
                <p className="text-xs text-[var(--text-muted)]">Izaberi dan za prikaz</p>
                <button
                  className="rounded-full bg-[#5055D2]/10 px-3 py-1.5 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/16 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isToday}
                  onClick={() => handleSelect(max)}
                  type="button"
                >
                  Danas
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
