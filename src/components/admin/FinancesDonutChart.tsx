"use client";

import { useMemo } from "react";

type DonutSlice = {
  mealType: string;
  label: string;
  value: number;
  color: string;
  percent: number;
};

type FinancesDonutChartProps = {
  items: { mealType: string; totalRsd: number }[];
};

const MEAL_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  breakfast: { label: "Doručak", color: "#85cc87", order: 0 },
  lunch: { label: "Ručak", color: "#4f85ff", order: 1 },
  dinner: { label: "Večera", color: "#ad9d44", order: 2 },
};

export function FinancesDonutChart({ items }: FinancesDonutChartProps) {
  const slices = useMemo(() => {
    const total = items.reduce((s, i) => s + i.totalRsd, 0);
    if (total === 0) return [];

    const sorted = [...items]
      .filter((i) => i.totalRsd > 0)
      .sort((a, b) => (MEAL_CONFIG[a.mealType]?.order ?? 99) - (MEAL_CONFIG[b.mealType]?.order ?? 99));

    return sorted.map((item) => ({
      mealType: item.mealType,
      label: MEAL_CONFIG[item.mealType]?.label ?? item.mealType,
      value: item.totalRsd,
      color: MEAL_CONFIG[item.mealType]?.color ?? "#888",
      percent: (item.totalRsd / total) * 100,
    }));
  }, [items]);

  const totalValue = items.reduce((s, i) => s + i.totalRsd, 0);

  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-[var(--bg-muted)]/50 p-8 text-sm text-[var(--text-secondary)]">
        Nema podataka za prikaz.
      </div>
    );
  }

  const cx = 50;
  const cy = 50;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = slices.map((slice) => {
    const dash = (slice.percent / 100) * circumference;
    const seg = { ...slice, dash, offset };
    offset -= dash;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-44 shrink-0">
        <svg aria-hidden="true" className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle cx={cx} cy={cy} fill="none" r={r} stroke="var(--card-border)" strokeWidth="8" />
          {segments.map((seg) => (
            <circle
              cx={cx}
              cy={cy}
              fill="none"
              key={seg.mealType}
              r={r}
              stroke={seg.color}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="round"
              strokeWidth="8"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold tabular-nums text-[var(--text-primary)]">
            {totalValue.toLocaleString("sr-RS")}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">RSD</span>
        </div>
      </div>

      <div className="space-y-2">
        {slices.map((slice) => (
          <div className="flex items-center gap-3 text-sm" key={slice.mealType}>
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-[4rem] text-[var(--text-primary)]">{slice.label}</span>
            <span className="tabular-nums font-semibold text-[var(--text-primary)]">
              {slice.value.toLocaleString("sr-RS")}
            </span>
            <span className="text-xs text-[var(--text-muted)]">({slice.percent.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
