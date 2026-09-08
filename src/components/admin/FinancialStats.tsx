"use client";

import { useMemo } from "react";
import {
  StaffCard,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
} from "@/components/staff";
import { formatRsd } from "@/lib/admin-helpers";

export type MealTypeBreakdownRow = {
  mealType: string;
  count: number;
  totalRsd: number;
};

type FinancialStatsProps = {
  data: MealTypeBreakdownRow[];
};

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner"];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

export function FinancialStats({ data }: FinancialStatsProps) {
  const sorted = useMemo(() => {
    const map = new Map(data.map((r) => [r.mealType, r]));
    return MEAL_TYPE_ORDER.map((key) => map.get(key)).filter(
      (r): r is MealTypeBreakdownRow => r !== undefined,
    );
  }, [data]);

  const totalCount = sorted.reduce((sum, r) => sum + r.count, 0);
  const totalRsd = sorted.reduce((sum, r) => sum + r.totalRsd, 0);

  if (sorted.length === 0) {
    return (
      <StaffCard padding="md">
        <p className="text-sm text-[var(--text-secondary)]">
          Nema podataka za izabrani period.
        </p>
      </StaffCard>
    );
  }

  return (
    <StaffCard padding="none">
      <div className="border-b border-[var(--card-border)] px-5 py-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Finansijski pregled
        </h2>
      </div>
      <div className="overflow-x-auto">
        <StaffTable>
          <StaffTableHead>
            <tr className="bg-[var(--bg-muted)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-5 py-3 font-semibold text-left">Tip obroka</th>
              <th className="px-5 py-3 font-semibold text-right">Broj uplaćenih</th>
              <th className="px-5 py-3 font-semibold text-right">Ukupno (RSD)</th>
            </tr>
          </StaffTableHead>
          <StaffTableBody>
            {sorted.map((row) => (
              <tr className="border-t" key={row.mealType}>
                <td className="px-5 py-3 font-medium">
                  {MEAL_TYPE_LABELS[row.mealType] ?? row.mealType}
                </td>
                <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                  {row.count}
                </td>
                <td className="px-5 py-3 tabular-nums text-right font-medium">
                  {formatRsd(row.totalRsd)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--text-primary)]/20 bg-[var(--bg-muted)]/50">
              <td className="px-5 py-3 font-bold">Ukupno</td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totalCount}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {formatRsd(totalRsd)}
              </td>
            </tr>
          </StaffTableBody>
        </StaffTable>
      </div>
    </StaffCard>
  );
}
