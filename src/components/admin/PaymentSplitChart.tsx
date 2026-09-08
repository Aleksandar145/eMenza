"use client";

import { useMemo } from "react";

type PaymentSplitChartProps = {
  cashTotalRsd: number;
  cardTotalRsd: number;
};

const CASH_COLOR = "#85cc87";
const CARD_COLOR = "#4f85ff";

export function PaymentSplitChart({ cashTotalRsd, cardTotalRsd }: PaymentSplitChartProps) {
  const slices = useMemo(() => {
    const total = cashTotalRsd + cardTotalRsd;
    if (total === 0) return [];

    return [
      {
        label: "Gotovina",
        value: cashTotalRsd,
        color: CASH_COLOR,
        percent: (cashTotalRsd / total) * 100,
      },
      {
        label: "Kartica",
        value: cardTotalRsd,
        color: CARD_COLOR,
        percent: (cardTotalRsd / total) * 100,
      },
    ];
  }, [cashTotalRsd, cardTotalRsd]);

  const total = cashTotalRsd + cardTotalRsd;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-[var(--bg-muted)]/50 p-6 text-sm text-[var(--text-secondary)]">
        Nema podataka za prikaz.
      </div>
    );
  }

  const cx = 50;
  const cy = 50;
  const r = 36;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = slices.map((slice) => {
    const dash = (slice.percent / 100) * circumference;
    const seg = { ...slice, dash, offset };
    offset -= dash;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative size-32 shrink-0">
        <svg aria-hidden="true" className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle cx={cx} cy={cy} fill="none" r={r} stroke="var(--card-border)" strokeWidth="10" />
          {segments.map((seg) => (
            <circle
              cx={cx}
              cy={cy}
              fill="none"
              key={seg.label}
              r={r}
              stroke={seg.color}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="round"
              strokeWidth="10"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold tabular-nums text-[var(--text-primary)]">
            {total.toLocaleString("sr-RS")}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)]">RSD</span>
        </div>
      </div>

      <div className="space-y-2">
        {slices.map((slice) => (
          <div className="flex items-center gap-3 text-sm" key={slice.label}>
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-[var(--text-primary)]">{slice.label}</span>
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
