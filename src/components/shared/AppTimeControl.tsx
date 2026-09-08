"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { useAppTime } from "@/contexts/AppTimeProvider";
import {
  formatAppDate,
  formatAppTime,
  getAppTimeOverrideLabel,
  setAppDateTimeFromParts,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/date-utils";

type AppTimeControlProps = {
  className?: string;
  variant?: "sidebar" | "topbar" | "compact";
};

function useClientMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return mounted;
}

export function AppTimeControl({ className = "", variant = "sidebar" }: AppTimeControlProps) {
  const { now, isOverridden, setDateTime, resetToRealTime } = useAppTime();
  const mounted = useClientMounted();
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const overrideLabel = getAppTimeOverrideLabel();
  const timeLabel = mounted ? formatAppTime(now) : "--:--:--";
  const dateLabel = mounted ? formatAppDate(now) : "Učitavanje...";

  function openEditor() {
    setDateValue(toDateInputValue(now));
    setTimeValue(toTimeInputValue(now));
    setExpanded(true);
  }

  function toggleEditor() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    openEditor();
  }

  function applyDateTime() {
    setAppDateTimeFromParts(dateValue, timeValue);
  }

  function shiftHours(delta: number) {
    const next = new Date(now);
    next.setHours(next.getHours() + delta);
    setDateTime(next);
    setDateValue(toDateInputValue(next));
    setTimeValue(toTimeInputValue(next));
  }

  function applyPreset(hours: number, minutes: number) {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    setDateTime(next);
    setDateValue(toDateInputValue(next));
    setTimeValue(toTimeInputValue(next));
  }

  useEffect(() => {
    if (!expanded || variant === "compact") {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded, variant]);

  const testBadge = mounted && isOverridden ? (
    <span
      className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800"
      title={`Test override (${overrideLabel})`}
    >
      test
    </span>
  ) : null;

  if (variant === "compact") {
    return (
      <div className={`md:hidden ${className}`}>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-black/8 bg-white/80 px-3 py-2 text-xs text-black/70"
          onClick={toggleEditor}
          type="button"
        >
          <Clock aria-hidden="true" className="shrink-0 text-[#5055D2]" size={14} />
          <span className="font-medium tabular-nums">{timeLabel}</span>
          <span className="text-black/45">·</span>
          <span>{dateLabel}</span>
          {testBadge}
          <ChevronDown
            aria-hidden="true"
            className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            size={14}
          />
        </button>
        {expanded ? (
          <div className="mt-2 rounded-2xl border border-black/8 bg-white p-3">
            <EditorFields
              dateValue={dateValue}
              onApply={applyDateTime}
              onDateChange={setDateValue}
              onPreset={applyPreset}
              onReset={resetToRealTime}
              onShiftHours={shiftHours}
              onTimeChange={setTimeValue}
              timeValue={timeValue}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "topbar") {
    return (
      <div className={`hidden sm:block ${className}`}>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
          onClick={toggleEditor}
          type="button"
        >
          <Clock aria-hidden="true" className="shrink-0 text-[#5055D2]" size={14} />
          <span className="tabular-nums">{timeLabel}</span>
          <span className="text-[var(--text-secondary)]/50">·</span>
          <span>{dateLabel}</span>
          {testBadge}
        </button>
        {expanded ? (
          <div className="absolute right-4 top-14 z-50 w-72 rounded-2xl border border-[var(--card-border)] bg-white p-3 shadow-lg">
            <EditorFields
              dateValue={dateValue}
              onApply={applyDateTime}
              onDateChange={setDateValue}
              onPreset={applyPreset}
              onReset={resetToRealTime}
              onShiftHours={shiftHours}
              onTimeChange={setTimeValue}
              timeValue={timeValue}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="rounded-2xl border border-black/[0.06] bg-white/75">
        <button
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
          onClick={toggleEditor}
          type="button"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#5055D2]/10">
            <Clock aria-hidden="true" className="text-[#5055D2]" size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tabular-nums text-black">{timeLabel}</p>
            <p className="truncate text-[10px] text-black/55">{dateLabel}</p>
          </div>
          {testBadge}
          <ChevronDown
            aria-hidden="true"
            className={`shrink-0 text-black/40 transition-transform ${expanded ? "rotate-180" : ""}`}
            size={14}
          />
        </button>
      </div>
      {expanded ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-lg">
          <EditorFields
            dateValue={dateValue}
            onApply={applyDateTime}
            onDateChange={setDateValue}
            onPreset={applyPreset}
            onReset={resetToRealTime}
            onShiftHours={shiftHours}
            onTimeChange={setTimeValue}
            timeValue={timeValue}
          />
        </div>
      ) : null}
    </div>
  );
}

type EditorFieldsProps = {
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onShiftHours: (delta: number) => void;
  onPreset: (hours: number, minutes: number) => void;
};

function EditorFields({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  onApply,
  onReset,
  onShiftHours,
  onPreset,
}: EditorFieldsProps) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">
        Test vreme aplikacije
      </p>
      <div className="grid grid-cols-1 gap-2">
        <label className="block text-xs text-black/55">
          Datum
          <input
            className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm text-black"
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={dateValue}
          />
        </label>
        <label className="block text-xs text-black/55">
          Vreme
          <input
            className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm tabular-nums text-black"
            onChange={(event) => onTimeChange(event.target.value)}
            step={1}
            type="time"
            value={timeValue}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <PresetButton label="+1h" onClick={() => onShiftHours(1)} />
        <PresetButton label="-1h" onClick={() => onShiftHours(-1)} />
        <PresetButton label="Ručak 12:00" onClick={() => onPreset(12, 0)} />
        <PresetButton label="Večera 18:00" onClick={() => onPreset(18, 0)} />
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-lg bg-[#5055D2] px-3 py-2 text-xs font-semibold text-white"
          onClick={onApply}
          type="button"
        >
          Primeni
        </button>
        <button
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-black/70"
          onClick={onReset}
          type="button"
        >
          Stvarno vreme
        </button>
      </div>
    </div>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="rounded-full border border-black/10 px-2 py-1 text-[10px] font-semibold text-black/65 hover:bg-black/[0.03]"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export default AppTimeControl;
