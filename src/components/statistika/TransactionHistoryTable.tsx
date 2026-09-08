"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Filter,
  Utensils,
  X,
} from "lucide-react";
import {
  formatStatisticsRsd,
  type StatisticsPagination,
  type StatisticsTransaction,
  type TransactionType,
} from "@/lib/statistika-types";
import {
  statsCard,
  statsCardHover,
  statsGradientBtn,
  statsGradientBtnStyle,
  statsSectionLabel,
} from "@/components/statistika/statistics-ui";
import { resolveAppLocale } from "@/i18n/locale";
import { useT } from "@/i18n/useT";

type TransactionHistoryTableProps = {
  transactions?: StatisticsTransaction[];
  pagination?: StatisticsPagination;
  isLoading?: boolean;
  selectedTypes: TransactionType[];
  appliedTypes: TransactionType[];
  from: string;
  to: string;
  appliedFrom?: string;
  appliedTo?: string;
  onTypesChange: (types: TransactionType[]) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onClearAppliedType: (type: TransactionType) => void;
  onClearAppliedDates: () => void;
  onPageChange: (page: number) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
};

const TYPE_OPTIONS: TransactionType[] = [
  "meal_charge",
  "refund",
  "top_up_cash",
  "top_up_bank",
];

function transactionIconStyle(type: TransactionType) {
  if (type === "meal_charge") {
    return {
      bg: "bg-red-50",
      icon: "text-red-500",
    };
  }
  return {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
  };
}

function StatusBadge({ status }: { status: StatisticsTransaction["status"] }) {
  const { t } = useT();
  const label =
    status === "success"
      ? t("statistics.statusSuccess")
      : status === "pending"
        ? t("statistics.statusPending")
        : t("statistics.statusError");
  const className =
    status === "success"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
      : status === "pending"
        ? "bg-[#5055D2]/10 text-[#5055D2] ring-1 ring-[#5055D2]/20"
        : "bg-red-50 text-red-600 ring-1 ring-red-100";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function getGroupLabel(date: Date, t: ReturnType<typeof useT>["t"], locale: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) {
    return t("statistics.groupToday");
  }
  if (target.getTime() === yesterday.getTime()) {
    return t("statistics.groupYesterday");
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function formatTransactionDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function TransactionRow({
  transaction,
  dateLocale,
}: {
  transaction: StatisticsTransaction;
  dateLocale: string;
}) {
  const Icon = transaction.type === "meal_charge" ? Utensils : CreditCard;
  const iconStyle = transactionIconStyle(transaction.type);
  const isCredit = transaction.amountRsd > 0;
  const isDebit = transaction.amountRsd < 0;
  const date = formatTransactionDate(transaction.createdAt, dateLocale);

  return (
    <>
      <td className="hidden px-5 py-3.5 text-xs tabular-nums text-black/50 lg:table-cell lg:px-6">
        {date}
      </td>
      <td className="px-4 py-3.5 lg:px-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconStyle.bg}`}
          >
            <Icon aria-hidden="true" className={iconStyle.icon} size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-black">{transaction.description}</p>
            <p className="mt-0.5 text-xs text-black/40 lg:hidden">{date}</p>
          </div>
        </div>
      </td>
      <td className="hidden px-5 py-3.5 lg:table-cell lg:px-6">
        <StatusBadge status={transaction.status} />
      </td>
      <td
        className={`px-4 py-3.5 text-right text-sm font-bold tabular-nums lg:px-6 ${
          isCredit ? "text-emerald-600" : isDebit ? "text-red-600" : "text-black"
        }`}
      >
        {formatStatisticsRsd(transaction.amountRsd, { signed: true })}
      </td>
    </>
  );
}

function MobileTransactionCard({
  transaction,
  dateLocale,
}: {
  transaction: StatisticsTransaction;
  dateLocale: string;
}) {
  const Icon = transaction.type === "meal_charge" ? Utensils : CreditCard;
  const iconStyle = transactionIconStyle(transaction.type);
  const isCredit = transaction.amountRsd > 0;
  const isDebit = transaction.amountRsd < 0;
  const date = formatTransactionDate(transaction.createdAt, dateLocale);

  return (
    <div className="rounded-[16px] border border-black/[0.05] bg-gradient-to-br from-white to-[#EFF1F4]/40 p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] transition-all hover:shadow-[0_4px_20px_rgba(80,85,210,0.08)]">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconStyle.bg}`}
        >
          <Icon aria-hidden="true" className={iconStyle.icon} size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug text-black">{transaction.description}</p>
            <p
              className={`shrink-0 text-sm font-bold tabular-nums ${
                isCredit ? "text-emerald-600" : isDebit ? "text-red-600" : "text-black"
              }`}
            >
              {formatStatisticsRsd(transaction.amountRsd, { signed: true })}
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-xs text-black/40">{date}</p>
            <StatusBadge status={transaction.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransactionHistoryTable({
  transactions = [],
  pagination,
  isLoading,
  selectedTypes,
  appliedTypes,
  from,
  to,
  appliedFrom,
  appliedTo,
  onTypesChange,
  onFromChange,
  onToChange,
  onApplyFilters,
  onResetFilters,
  onClearAppliedType,
  onClearAppliedDates,
  onPageChange,
  onExportCsv,
  onExportPdf,
}: TransactionHistoryTableProps) {
  const { t, language } = useT();
  const dateLocale = resolveAppLocale(language);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const typeLabels = useMemo(
    () => ({
      meal_charge: t("statistics.typeMealCharge"),
      refund: t("statistics.typeRefund"),
      top_up_cash: t("statistics.typeTopUpCash"),
      top_up_bank: t("statistics.typeTopUpBank"),
    }),
    [t],
  );

  const grouped = useMemo(() => {
    const withLabels = transactions.reduce<
      Array<{ groupKey: string; groupLabel: string; items: StatisticsTransaction[] }>
    >((acc, transaction) => {
      const groupKey = new Intl.DateTimeFormat("en-CA").format(new Date(transaction.createdAt));
      const groupLabel = getGroupLabel(new Date(transaction.createdAt), t, dateLocale);
      const existing = acc.find((entry) => entry.groupKey === groupKey);
      if (existing) {
        existing.items.push(transaction);
        return acc;
      }
      acc.push({ groupKey, groupLabel, items: [transaction] });
      return acc;
    }, []);
    return withLabels;
  }, [dateLocale, transactions, t]);

  const hasActiveFilters =
    appliedTypes.length > 0 || Boolean(appliedFrom) || Boolean(appliedTo);

  function toggleType(type: TransactionType) {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((entry) => entry !== type));
      return;
    }
    onTypesChange([...selectedTypes, type]);
  }

  const pageNumbers = pagination
    ? Array.from({ length: pagination.totalPages }, (_, index) => index + 1).slice(
        Math.max(0, pagination.page - 3),
        pagination.page + 2,
      )
    : [];

  useEffect(() => {
    if (!exportOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!exportRef.current?.contains(event.target as Node)) {
        setExportOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [exportOpen]);

  return (
    <div className={`overflow-hidden ${statsCard} ${statsCardHover}`}>
      <div className="flex flex-col gap-4 border-b border-black/[0.05] bg-gradient-to-r from-white via-white to-[#5055D2]/[0.03] p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <h2 className="text-base font-bold tracking-tight text-black lg:text-lg">
            {t("statistics.transactions")}
          </h2>
          <p className="mt-0.5 text-xs text-black/50 lg:text-sm">
            {t("statistics.transactionsSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              filtersOpen
                ? "border-[#5055D2]/25 bg-[#5055D2]/10 text-[#5055D2]"
                : "border-black/5 bg-white text-black/70 hover:border-[#5055D2]/20 hover:text-black"
            }`}
            onClick={() => setFiltersOpen((current) => !current)}
            type="button"
          >
            <Filter aria-hidden="true" size={15} />
            {t("statistics.filters")}
          </button>
          <div className="relative" ref={exportRef}>
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${statsGradientBtn}`}
              onClick={() => setExportOpen((current) => !current)}
              style={statsGradientBtnStyle}
              type="button"
            >
              <Download aria-hidden="true" size={15} />
              {t("statistics.exportMenu")}
              <ChevronDown aria-hidden="true" size={14} />
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-20 mt-2 min-w-[148px] overflow-hidden rounded-2xl border border-black/5 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <button
                  className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-[#EFF1F4]"
                  onClick={() => {
                    setExportOpen(false);
                    onExportCsv();
                  }}
                  type="button"
                >
                  {t("statistics.exportCsv")}
                </button>
                <button
                  className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-[#EFF1F4]"
                  onClick={() => {
                    setExportOpen(false);
                    onExportPdf();
                  }}
                  type="button"
                >
                  {t("statistics.exportPdf")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="flex flex-wrap gap-2 border-b border-black/5 bg-[#EFF1F4]/40 px-5 py-3 lg:px-6">
          {appliedTypes.map((type) => (
            <button
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5055D2] ring-1 ring-[#5055D2]/20 transition-colors hover:bg-[#5055D2]/5"
              key={type}
              onClick={() => onClearAppliedType(type)}
              type="button"
            >
              {typeLabels[type]}
              <X aria-hidden="true" size={12} />
            </button>
          ))}
          {appliedFrom || appliedTo ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-black shadow-sm"
              onClick={onClearAppliedDates}
              type="button"
            >
              {appliedFrom ?? "…"} — {appliedTo ?? "…"}
              <X aria-hidden="true" size={12} />
            </button>
          ) : null}
        </div>
      ) : null}

      {filtersOpen ? (
        <div className="border-b border-black/5 bg-[#EFF1F4]/30 p-5 lg:p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-black/45">
            {t("statistics.filterType")}
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((type) => (
              <button
                className={`rounded-full px-3.5 py-1.5 text-sm transition-all ${
                  selectedTypes.includes(type)
                    ? "bg-[#5055D2] font-semibold text-white shadow-[0_2px_8px_rgba(80,85,210,0.3)]"
                    : "bg-white text-black/55 ring-1 ring-black/5 hover:text-black"
                }`}
                key={type}
                onClick={() => toggleType(type)}
                type="button"
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-black/65">
              {t("statistics.filterFrom")}
              <input
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2"
                onChange={(event) => onFromChange(event.target.value)}
                type="date"
                value={from}
              />
            </label>
            <label className="text-sm text-black/65">
              {t("statistics.filterTo")}
              <input
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2"
                onChange={(event) => onToChange(event.target.value)}
                type="date"
                value={to}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm ${statsGradientBtn}`}
              onClick={onApplyFilters}
              style={statsGradientBtnStyle}
              type="button"
            >
              {t("statistics.filterApply")}
            </button>
            <button
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black"
              onClick={onResetFilters}
              type="button"
            >
              {t("statistics.filterReset")}
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && transactions.length === 0 ? (
        <div className="px-5 py-12 text-center lg:px-6">
          <p className="text-sm text-black/55">
            {hasActiveFilters
              ? t("statistics.noFilteredTransactions")
              : t("statistics.emptyDescription")}
          </p>
          {hasActiveFilters ? (
            <button
              className="mt-4 rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white"
              onClick={onResetFilters}
              type="button"
            >
              {t("statistics.filterReset")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="space-y-3 p-4 lg:hidden">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div className="h-24 animate-pulse rounded-2xl bg-black/5" key={index} />
                ))
              : grouped.map((group) => (
                  <div key={group.groupKey}>
                    <p className="mb-2 inline-flex rounded-full bg-[#EFF1F4] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/45">
                      {group.groupLabel}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((transaction) => (
                        <MobileTransactionCard
                          dateLocale={dateLocale}
                          key={transaction.id}
                          transaction={transaction}
                        />
                      ))}
                    </div>
                  </div>
                ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="sticky top-0 z-10 border-b border-black/5 bg-white">
                <tr>
                  {[t("statistics.tableDate"), t("statistics.tableDescription"), t("statistics.tableStatus"), t("statistics.tableAmount")].map(
                    (header, index) => (
                      <th
                        className={`px-5 py-3 ${statsSectionLabel} lg:px-6 ${
                          index === 3 ? "text-right" : ""
                        } ${index === 0 ? "hidden lg:table-cell" : ""} ${index === 2 ? "hidden lg:table-cell" : ""}`}
                        key={header}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-5 py-3.5 lg:px-6" colSpan={4}>
                          <div className="h-3.5 w-full animate-pulse rounded bg-black/8" />
                        </td>
                      </tr>
                    ))
                  : grouped.map((group) => (
                      <Fragment key={group.groupKey}>
                        <tr>
                          <td className="bg-[#EFF1F4]/50 px-5 py-2 lg:px-6" colSpan={4}>
                            <span className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/45">
                              {group.groupLabel}
                            </span>
                          </td>
                        </tr>
                        {group.items.map((transaction) => (
                          <tr
                            className="transition-colors hover:bg-[#5055D2]/[0.03]"
                            key={transaction.id}
                          >
                            <TransactionRow dateLocale={dateLocale} transaction={transaction} />
                          </tr>
                        ))}
                      </Fragment>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pagination && transactions.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-black/5 bg-[#EFF1F4]/30 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
          <span className="text-sm font-light text-black/55">
            {t("statistics.shownCount", {
              shown: transactions.length,
              total: pagination.total,
            })}
          </span>
          <div className="flex items-center gap-1">
            <button
              aria-label={t("statistics.previousPage")}
              className="flex size-8 items-center justify-center rounded-full border border-black/5 bg-white text-black/50 transition-colors hover:border-[#5055D2]/20 disabled:opacity-40"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                className={`flex size-8 items-center justify-center rounded-full text-sm transition-all ${
                  pageNumber === pagination.page
                    ? "bg-[#5055D2] font-semibold text-white shadow-[0_2px_8px_rgba(80,85,210,0.3)]"
                    : "border border-black/5 bg-white text-black/50 hover:border-[#5055D2]/20"
                }`}
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              aria-label={t("statistics.nextPage")}
              className="flex size-8 items-center justify-center rounded-full border border-black/5 bg-white text-black/50 transition-colors hover:border-[#5055D2]/20 disabled:opacity-40"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TransactionHistoryTable;
