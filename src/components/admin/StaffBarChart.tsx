"use client";

import { useMemo } from "react";

type StaffBarItem = {
  staffId: string;
  fullName: string;
  totalRsd: number;
};

type StaffBarChartProps = {
  data: StaffBarItem[];
  limit?: number;
};

const BAR_COLORS = [
  "#4f85ff",
  "#85cc87",
  "#ad9d44",
  "#e8794f",
  "#a78bfa",
  "#f472b6",
];

export function StaffBarChart({ data, limit }: StaffBarChartProps) {
  const displayed = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.totalRsd - a.totalRsd);
    return limit && limit < sorted.length ? sorted.slice(0, limit) : sorted;
  }, [data, limit]);

  const hiddenCount = data.length - displayed.length;

  const bars = useMemo(() => {
    const max = Math.max(...displayed.map((d) => d.totalRsd), 1);
    return displayed.map((d, i) => ({
      ...d,
      percent: (d.totalRsd / max) * 100,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));
  }, [displayed]);

  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-[var(--bg-muted)]/50 p-8 text-sm text-[var(--text-secondary)]">
        Nema podataka za prikaz.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bars.map((bar) => (
        <div key={bar.staffId}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--text-primary)]">{bar.fullName}</span>
            <span className="tabular-nums font-semibold text-[var(--text-primary)]">
              {bar.totalRsd.toLocaleString("sr-RS")} RSD
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-muted)] ring-1 ring-inset ring-[var(--card-border)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${bar.percent}%`,
                backgroundColor: bar.color,
              }}
            />
          </div>
        </div>
      ))}
      {hiddenCount > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-[var(--card-border)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
          <span>Još {hiddenCount} zaposlenih</span>
        </div>
      ) : null}
    </div>
  );
}
