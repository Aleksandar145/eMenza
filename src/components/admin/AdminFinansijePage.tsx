"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, DollarSign, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  StaffCard,
  StaffSegmentedControl,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
} from "@/components/staff";
import { apiGet } from "@/lib/api/client";
import { FinancialStats, type MealTypeBreakdownRow } from "@/components/admin/FinancialStats";
import { StaffPerformance } from "@/components/admin/StaffPerformance";
import { useReferentCards } from "@/hooks/useReferentCards";
import { AdminFinanceHistory } from "@/components/admin/AdminFinanceHistory";
import { FinancesDonutChart } from "@/components/admin/FinancesDonutChart";
import { PaymentSplitChart } from "@/components/admin/PaymentSplitChart";
import { AdminDatePicker } from "@/components/admin/AdminDatePicker";
import { IncomeExpenseSummary } from "@/components/admin/IncomeExpenseSummary";
import { toDateKey } from "@/lib/calendar-utils";
import { formatRsd } from "@/lib/admin-helpers";

type ActiveTab = "pregled" | "istorija" | "ucinak";
type Period = "week" | "month" | "year";

type FinancesResponse = {
  mealTypeBreakdown: MealTypeBreakdownRow[];
  paymentMethods: {
    cashTotalRsd: number;
    cardTotalRsd: number;
  };
  comparison: {
    total: {
      percentChange: number;
      previousTotalRsd: number;
      direction: "up" | "down" | "flat";
    };
    cash: {
      percentChange: number;
      previousTotalRsd: number;
      direction: "up" | "down" | "flat";
    };
    card: {
      percentChange: number;
      previousTotalRsd: number;
      direction: "up" | "down" | "flat";
    };
  };
  profit: {
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
};

const periodOptions: { id: Period; label: string }[] = [
  { id: "week", label: "Nedeljni" },
  { id: "month", label: "Mesečni" },
  { id: "year", label: "Godišnji" },
];

type ComparisonValue = {
  percentChange: number;
  direction: "up" | "down" | "flat";
};

function renderComparison(
  c: ComparisonValue | undefined,
  period: Period,
  showLabel?: boolean,
) {
  if (!c) return null;

  if (c.percentChange !== 0) {
    const isUp = c.direction === "up";
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          isUp ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {c.percentChange > 0 ? "+" : ""}
        {c.percentChange}%
        {showLabel && ` u odnosu na ${comparisonPeriodLabel[period]}`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
      —{showLabel && ` isto kao ${comparisonPeriodLabel[period]}`}
    </span>
  );
}

function formatPrintedAt() {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

const periodLabel: Record<Period, string> = {
  week: "Nedeljni",
  month: "Mesečni",
  year: "Godišnji",
};

const tabLabel: Record<ActiveTab, string> = {
  pregled: "Finansijski pregled",
  istorija: "Istorija finansija",
  ucinak: "Učinak zaposlenih",
};

const comparisonPeriodLabel: Record<Period, string> = {
  week: "prošle nedelje",
  month: "prošlog meseca",
  year: "prošle godine",
};

const todayKey = toDateKey({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  day: new Date().getDate(),
});

export function AdminFinansijePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pregled");
  const [period, setPeriod] = useState<Period>("month");
  const [anchorDateKey, setAnchorDateKey] = useState(todayKey);
  const [data, setData] = useState<FinancesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const { state: cardsState } = useReferentCards();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (anchorDateKey !== todayKey) {
        params.set("anchorDate", anchorDateKey);
      }
      const result = await apiGet<FinancesResponse>(
        `/api/admin/finances?${params}`,
      );
      setData(result);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [period, anchorDateKey, todayKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div ref={printRef} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <StaffSegmentedControl
          options={[
            { id: "pregled" as const, label: "Finansijski pregled" },
            { id: "istorija" as const, label: "Istorija finansija" },
            { id: "ucinak" as const, label: "Učinak zaposlenih" },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex flex-wrap items-center gap-2">
          {periodOptions.map((option) => {
            const isActive = period === option.id;
            return (
              <button
                aria-pressed={isActive}
                className={isActive ? staffButtonPrimaryClass : staffButtonSecondaryClass}
                key={option.id}
                onClick={() => setPeriod(option.id)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}

          <AdminDatePicker
            max={todayKey}
            onChange={setAnchorDateKey}
            value={anchorDateKey}
          />

          <button
            className={staffButtonSecondaryClass + " inline-flex items-center gap-2"}
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={16} />
            Štampaj
          </button>
        </div>
      </div>

      <div className="hidden print:block border-b border-black/10 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">eMenza</p>
        <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
          {tabLabel[activeTab]}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Period: {periodLabel[period]} izveštaj
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Štampano: {formatPrintedAt()}
        </p>
      </div>

      {activeTab === "istorija" ? (
        <AdminFinanceHistory />
      ) : loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
      ) : activeTab === "pregled" ? (
        <div className="space-y-5">
          <IncomeExpenseSummary data={data?.profit} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <StaffCard padding="md" title="Raspored prihoda">
                <FinancesDonutChart items={data?.mealTypeBreakdown ?? []} />
              </StaffCard>
            </div>
            <div className="lg:col-span-3">
              <FinancialStats data={data?.mealTypeBreakdown ?? []} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <StaffCard padding="md" title="Metode plaćanja">
                <PaymentSplitChart
                  cashTotalRsd={data?.paymentMethods.cashTotalRsd ?? 0}
                  cardTotalRsd={data?.paymentMethods.cardTotalRsd ?? 0}
                />
              </StaffCard>
            </div>
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StaffCard padding="lg">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <DollarSign size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Gotovina</p>
                      <div className="mt-1 flex items-center gap-3">
                        <p className="text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
                          {formatRsd(data?.paymentMethods.cashTotalRsd ?? 0)}
                        </p>
                        {renderComparison(data?.comparison.cash, period)}
                      </div>
                    </div>
                  </div>
                </StaffCard>

                <StaffCard padding="lg">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#5055D2]/10 text-[#5055D2]">
                      <CreditCard size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-secondary)]">
                        Kartica <span className="text-xs text-[var(--text-muted)]">(mock)</span>
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <p className="text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
                          {formatRsd(data?.paymentMethods.cardTotalRsd ?? 0)}
                        </p>
                        {renderComparison(data?.comparison.card, period)}
                      </div>
                    </div>
                  </div>
                </StaffCard>
              </div>

              <div className="mt-4">
                <StaffCard padding="lg">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Wallet size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-secondary)]">
                        Ukupan promet
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <p className="text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
                          {formatRsd(
                            (data?.paymentMethods.cashTotalRsd ?? 0) +
                              (data?.paymentMethods.cardTotalRsd ?? 0),
                          )}
                        </p>
                        {renderComparison(data?.comparison.total, period, true)}
                      </div>
                    </div>
                  </div>
                </StaffCard>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <StaffPerformance
          anchorDateKey={anchorDateKey}
          logs={cardsState.actionLogs}
          period={period}
        />
      )}
    </div>
  );
}
