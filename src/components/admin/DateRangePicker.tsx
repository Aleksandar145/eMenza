"use client";

import { staffInputClass } from "@/components/staff";

type DateRangePickerProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        className={staffInputClass + " w-40"}
        onChange={(e) => onFromChange(e.target.value)}
        type="date"
        value={from}
      />
      <span className="text-sm text-[var(--text-muted)]">—</span>
      <input
        className={staffInputClass + " w-40"}
        onChange={(e) => onToChange(e.target.value)}
        type="date"
        value={to}
      />
    </div>
  );
}
