"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { MealBreakdownChart } from "@/components/statistika/MealBreakdownChart";
import { SpendingTrendChart } from "@/components/statistika/SpendingTrendChart";
import { StatSummaryCards } from "@/components/statistika/StatSummaryCards";
import { StatisticsEmptyState } from "@/components/statistika/StatisticsEmptyState";
import { StatisticsInsights } from "@/components/statistika/StatisticsInsights";
import { StatisticsPageHeader } from "@/components/statistika/StatisticsPageHeader";
import { TransactionHistoryTable } from "@/components/statistika/TransactionHistoryTable";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useStudentStatistics } from "@/hooks/useStudentStatistics";
import {
  downloadStatisticsCsv,
  fetchStatisticsExportTransactions,
} from "@/lib/backend/statistics-api";
import { openStatisticsPdfExport } from "@/lib/export-statistics-pdf";
import {
  canAdvanceAnchor,
  clampAnchorDateKey,
  shiftAnchorDateKey,
} from "@/lib/statistics-period";
import type { SpendingPeriod, TransactionType } from "@/lib/statistika-types";
import { useT } from "@/i18n/useT";

export function Statistika() {
  const { t } = useT();
  const todayDateKey = useTodayDateKey();
  const [period, setPeriod] = useState<SpendingPeriod>("weekly");
  const [anchorDateKey, setAnchorDateKey] = useState(todayDateKey);
  const [page, setPage] = useState(1);
  const [draftTypes, setDraftTypes] = useState<TransactionType[]>([]);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [appliedTypes, setAppliedTypes] = useState<TransactionType[]>([]);
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>();
  const [appliedTo, setAppliedTo] = useState<string | undefined>();
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnchorDateKey((current) => clampAnchorDateKey(current, todayDateKey));
  }, [todayDateKey]);

  const canGoNext = useMemo(
    () => canAdvanceAnchor(period, anchorDateKey, todayDateKey),
    [anchorDateKey, period, todayDateKey],
  );

  const query = useMemo(
    () => ({
      period,
      anchorDate: anchorDateKey,
      page,
      pageSize: 10,
      types: appliedTypes.length > 0 ? appliedTypes : undefined,
      from: appliedFrom,
      to: appliedTo,
    }),
    [anchorDateKey, appliedFrom, appliedTo, appliedTypes, page, period],
  );

  const { data, isLoading, isUnavailable, isPending, error, refresh } = useStudentStatistics(query);
  const mounted = useClientMounted();

  useEffect(() => {
    if (data && !isLoading && !error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUpdatedAt(new Date());
    }
  }, [data, error, isLoading]);

  function handleAnchorDateChange(nextDateKey: string) {
    setAnchorDateKey(clampAnchorDateKey(nextDateKey, todayDateKey));
    setPage(1);
  }

  function renderDashboardContent(loading: boolean) {
    return (
      <div className="space-y-6">
        <StatisticsPageHeader
          anchorDateKey={anchorDateKey}
          canGoNext={canGoNext}
          isRefreshing={loading}
          maxDateKey={todayDateKey}
          onAnchorDateChange={handleAnchorDateChange}
          onNextPeriod={() => {
            setAnchorDateKey((current) =>
              clampAnchorDateKey(shiftAnchorDateKey(period, current, 1), todayDateKey),
            );
            setPage(1);
          }}
          onPeriodChange={(nextPeriod) => {
            setPeriod(nextPeriod);
            setPage(1);
          }}
          onPreviousPeriod={() => {
            setAnchorDateKey((current) => shiftAnchorDateKey(period, current, -1));
            setPage(1);
          }}
          onRefresh={() => void refresh()}
          period={period}
          periodTitle={data?.trend.title}
          updatedAt={updatedAt}
        />

        <StatSummaryCards isLoading={loading} period={period} summary={data?.summary} />

        <StatisticsInsights
          isLoading={loading}
          items={data?.breakdown.items}
          points={data?.trend.points}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
          <SpendingTrendChart
            isLoading={loading}
            points={data?.trend.points}
            title={data?.trend.title}
          />
          <MealBreakdownChart
            isLoading={loading}
            items={data?.breakdown.items}
            title={data?.breakdown.title}
            total={data?.breakdown.total}
          />
        </div>

        <TransactionHistoryTable
          appliedFrom={appliedFrom}
          appliedTo={appliedTo}
          appliedTypes={appliedTypes}
          from={draftFrom}
          isLoading={loading}
          onApplyFilters={() => {
            setAppliedTypes(draftTypes);
            setAppliedFrom(draftFrom || undefined);
            setAppliedTo(draftTo || undefined);
            setPage(1);
          }}
          onClearAppliedDates={() => {
            setDraftFrom("");
            setDraftTo("");
            setAppliedFrom(undefined);
            setAppliedTo(undefined);
            setPage(1);
          }}
          onClearAppliedType={(type) => {
            const nextTypes = appliedTypes.filter((entry) => entry !== type);
            setDraftTypes(nextTypes);
            setAppliedTypes(nextTypes);
            setPage(1);
          }}
          onExportCsv={() => void handleExportCsv()}
          onExportPdf={() => void handleExportPdf()}
          onFromChange={setDraftFrom}
          onPageChange={setPage}
          onResetFilters={() => {
            setDraftTypes([]);
            setDraftFrom("");
            setDraftTo("");
            setAppliedTypes([]);
            setAppliedFrom(undefined);
            setAppliedTo(undefined);
            setPage(1);
          }}
          onToChange={setDraftTo}
          onTypesChange={setDraftTypes}
          pagination={data?.pagination}
          selectedTypes={draftTypes}
          to={draftTo}
          transactions={data?.transactions}
        />
      </div>
    );
  }

  async function handleExportCsv() {
    const blob = await downloadStatisticsCsv({
      period,
      anchorDate: anchorDateKey,
      types: appliedTypes.length > 0 ? appliedTypes : undefined,
      from: appliedFrom,
      to: appliedTo,
      pageSize: 1000,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "emenza-transakcije.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportPdf() {
    const payload = await fetchStatisticsExportTransactions({
      period,
      anchorDate: anchorDateKey,
      types: appliedTypes.length > 0 ? appliedTypes : undefined,
      from: appliedFrom,
      to: appliedTo,
      pageSize: 1000,
    });

    openStatisticsPdfExport(payload.transactions, {
      title: t("statistics.pdfTitle"),
      date: t("statistics.tableDate"),
      description: t("statistics.tableDescription"),
      status: t("statistics.tableStatus"),
      amount: t("statistics.tableAmount"),
      success: t("statistics.statusSuccess"),
    });
  }

  return (
    <AppLayout title={t("statistics.title")}>
      {!mounted || isPending ? (
        renderDashboardContent(true)
      ) : isUnavailable ? (
        <StatisticsEmptyState variant="unavailable" />
      ) : error ? (
        <StatisticsEmptyState message={error} onRetry={() => void refresh()} variant="error" />
      ) : !data?.hasData ? (
        <StatisticsEmptyState variant="empty" />
      ) : (
        renderDashboardContent(isLoading)
      )}
    </AppLayout>
  );
}

export default Statistika;
