"use client";

import { CircleHelp, TrendingDown, TrendingUp } from "lucide-react";
import { ArrowUpRight, PiggyBank, ShoppingCart } from "lucide-react";
import { StaffCard } from "@/components/staff";
import { formatRsd } from "@/lib/admin-helpers";

type ComparisonValue = {
  percentChange: number;
  direction: "up" | "down" | "flat";
};

export type IncomeExpenseData = {
  totalIncomeRsd: number;
  expensesRsd: number;
  netProfitRsd: number;
  previousTotalIncomeRsd: number;
  previousExpensesRsd: number;
  previousNetProfitRsd: number;
  incomeChange: ComparisonValue;
  expensesChange: ComparisonValue;
  netProfitChange: ComparisonValue;
};

function changeLabel(c: ComparisonValue, invert?: boolean) {
  if (c.percentChange === 0) {
    return <span className="text-xs font-semibold text-[var(--text-muted)]">—</span>;
  }
  const isUp = invert ? c.direction === "down" : c.direction === "up";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isUp ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {c.percentChange > 0 ? "+" : ""}
      {c.percentChange}%
    </span>
  );
}

function SummaryCard({
  title,
  value,
  comparison,
  icon,
  iconClass,
  invertComparison,
  valueClass,
}: {
  title: string;
  value: number;
  comparison?: ComparisonValue;
  icon: React.ReactNode;
  iconClass: string;
  invertComparison?: boolean;
  valueClass?: string;
}) {
  return (
    <StaffCard padding="lg">
      <div className="flex items-start gap-4">
        <span
          className={`inline-flex size-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <div className="mt-1 flex items-center gap-3">
            <p
              className={`text-2xl font-extrabold tabular-nums ${valueClass ?? "text-[var(--text-primary)]"}`}
            >
              {formatRsd(value)}
            </p>
            {comparison && changeLabel(comparison, invertComparison)}
          </div>
        </div>
      </div>
    </StaffCard>
  );
}

export function IncomeExpenseSummary({ data }: { data?: IncomeExpenseData }) {
  const resolved: IncomeExpenseData = data ?? {
    totalIncomeRsd: 0,
    expensesRsd: 0,
    netProfitRsd: 0,
    previousTotalIncomeRsd: 0,
    previousExpensesRsd: 0,
    previousNetProfitRsd: 0,
    incomeChange: { percentChange: 0, direction: "flat" },
    expensesChange: { percentChange: 0, direction: "flat" },
    netProfitChange: { percentChange: 0, direction: "flat" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
          Prihod i rashod
          <span
            className="inline-flex cursor-help items-center text-[var(--text-muted)]"
            title="Neto zarada = ukupan prihod − rashod. Rashod obuhvata finalizovane nabavke (totalRsd) u posmatranom periodu."
          >
            <CircleHelp aria-label="Objašnjenje" size={14} />
          </span>
        </h3>
        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
          u posmatranom periodu
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<ArrowUpRight size={24} />}
          iconClass="bg-emerald-500/10 text-emerald-600"
          title="Ukupan prihod"
          value={resolved.totalIncomeRsd}
          comparison={resolved.incomeChange}
        />

        <SummaryCard
          icon={<ShoppingCart size={24} />}
          iconClass="bg-red-500/10 text-red-500"
          title="Rashod (nabavke)"
          value={resolved.expensesRsd}
          comparison={resolved.expensesChange}
          invertComparison
          valueClass="text-red-600"
        />

        <SummaryCard
          icon={<PiggyBank size={24} />}
          iconClass="bg-[#5055D2]/10 text-[#5055D2]"
          title="Neto zarada"
          value={resolved.netProfitRsd}
          comparison={resolved.netProfitChange}
        />
      </div>
    </div>
  );
}
