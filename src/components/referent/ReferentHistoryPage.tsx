"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash2,
  Clock,
  Coins,
  Download,
  Printer,
  RefreshCcw,
  RotateCcw,
  Shield,
  Undo2,
} from "lucide-react";
import {
  StaffCard,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
} from "@/components/staff";
import { useReferentCards } from "@/hooks/useReferentCards";
import { useReferentSession } from "@/hooks/useReferentSession";
import { formatRsd } from "@/lib/admin-helpers";
import {
  getPeriodDateKeys,
  getReferentReport,
  getReferentReportBreakdown,
  type ReportPeriod,
} from "@/lib/referent-reports-mock";
import {
  type ReferentActionLog,
  type ReferentActionType,
  type StudentCard,
} from "@/lib/referent-cards-mock";

const periodOptions: { id: ReportPeriod; label: string }[] = [
  { id: "day", label: "Dan" },
  { id: "week", label: "Nedelja" },
  { id: "month", label: "Mesec" },
  { id: "year", label: "Godina" },
];

const periodReportTitles: Record<ReportPeriod, string> = {
  day: "Dnevni izveštaj",
  week: "Nedeljni izveštaj",
  month: "Mesečni izveštaj",
  year: "Godišnji izveštaj",
};

const actionLabels: Record<ReferentActionType, string> = {
  activate: "Aktivacija",
  block: "Blokada",
  unblock: "Deblokada",
  top_up: "Dopuna",
  extend: "Produženje",
  refund: "Refundacija",
  reversal: "Opoziv",
};

const actionTypeFilter: { id: ReferentActionType | "all"; label: string }[] = [
  { id: "all", label: "Sve akcije" },
  { id: "top_up", label: "Dopune" },
  { id: "activate", label: "Aktivacije" },
  { id: "block", label: "Blokade" },
  { id: "unblock", label: "Deblokade" },
  { id: "extend", label: "Produženja" },
  { id: "refund", label: "Refundacije" },
];

type ActionStyle = {
  color: string;
  chip: string;
  solid: string;
};

function actionStyle(action: ReferentActionType): ActionStyle {
  switch (action) {
    case "activate":
      return {
        color: "text-emerald-700",
        chip: "bg-emerald-100 text-emerald-800",
        solid: "bg-emerald-600",
      };
    case "block":
      return {
        color: "text-red-700",
        chip: "bg-red-100 text-red-700",
        solid: "bg-red-600",
      };
    case "unblock":
      return {
        color: "text-amber-700",
        chip: "bg-amber-100 text-amber-800",
        solid: "bg-amber-500",
      };
    case "top_up":
      return {
        color: "text-blue-700",
        chip: "bg-blue-100 text-blue-800",
        solid: "bg-blue-600",
      };
    case "extend":
      return {
        color: "text-[#5055D2]",
        chip: "bg-[#5055D2]/10 text-[#5055D2]",
        solid: "bg-[#5055D2]",
      };
    case "refund":
      return {
        color: "text-orange-700",
        chip: "bg-orange-100 text-orange-700",
        solid: "bg-orange-500",
      };
    case "reversal":
      return {
        color: "text-slate-700",
        chip: "bg-slate-100 text-slate-700",
        solid: "bg-slate-500",
      };
  }
}

function actionIcon(action: ReferentActionType) {
  switch (action) {
    case "activate":
      return CheckCircle2;
    case "block":
      return Ban;
    case "unblock":
      return Undo2;
    case "top_up":
      return Coins;
    case "extend":
      return RefreshCcw;
    case "refund":
      return CircleSlash2;
    case "reversal":
      return RotateCcw;
  }
}

function shiftDateKey(dateKey: string, period: ReportPeriod, direction: -1 | 1): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (period === "day") {
    date.setDate(date.getDate() + direction);
  } else if (period === "week") {
    date.setDate(date.getDate() + direction * 7);
  } else if (period === "month") {
    date.setMonth(date.getMonth() + direction);
  } else {
    date.setFullYear(date.getFullYear() + direction);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function logDateKey(log: ReferentActionLog): string {
  const date = new Date(log.at);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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

function generateCsv(
  summary: ReturnType<typeof getReferentReport>,
  breakdown: ReturnType<typeof getReferentReportBreakdown>,
): string {
  const lines: string[] = [];
  lines.push(`Izveštaj,${summary.label}`);
  lines.push("");
  lines.push("KPI,Vrednost");
  lines.push(`Ukupno uplaćeno,${summary.totalCashTopUpRsd}`);
  lines.push(`Broj dopuna,${summary.topUpCount}`);
  lines.push(`Aktivacije,${summary.activationsCount}`);
  lines.push(`Broj studenata,${summary.uniqueStudentsCount}`);
  lines.push(`Produženja,${summary.extensionsCount}`);
  lines.push(`Blokade,${summary.blocksCount}`);

  if (breakdown.length > 0) {
    lines.push("");
    lines.push("Period,Uplaćeno,Dopune,Aktivacije,Studenti,Produženja,Blokade");
    for (const row of breakdown) {
      lines.push(
        `"${row.label}",${row.totalCashTopUpRsd},${row.topUpCount},${row.activationsCount},${row.uniqueStudentsCount},${row.extensionsCount},${row.blocksCount}`,
      );
    }
  }

  return lines.join("\n");
}

export function ReferentHistoryPage() {
  const { state } = useReferentCards();
  const { session } = useReferentSession();
  const [period, setPeriod] = useState<ReportPeriod>("day");
  const [actionFilter, setActionFilter] = useState<ReferentActionType | "all">("all");
  const todayKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);
  const [referenceDate, setReferenceDate] = useState(todayKey);

  const cardById = useMemo(() => {
    const map = new Map<string, StudentCard>();
    for (const card of state.cards) {
      map.set(card.id, card);
    }
    return map;
  }, [state.cards]);

  const periodKeys = useMemo(
    () => new Set(getPeriodDateKeys(period, referenceDate)),
    [period, referenceDate],
  );

  const periodLogs = useMemo(() => {
    const ownName = session?.displayName;
    return state.actionLogs.filter(
      (log) =>
        periodKeys.has(logDateKey(log)) &&
        (actionFilter === "all" || log.action === actionFilter) &&
        (!ownName || log.referentName === ownName),
    );
  }, [state.actionLogs, periodKeys, actionFilter, session?.displayName]);

  const filteredLogs = useMemo(() => {
    return [...periodLogs].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [periodLogs]);

  const summary = useMemo(
    () => getReferentReport(period, referenceDate, periodLogs),
    [period, referenceDate, periodLogs],
  );
  const breakdown = useMemo(
    () => getReferentReportBreakdown(period, referenceDate, periodLogs),
    [period, referenceDate, periodLogs],
  );

  const kpiCards = [
    { label: "Uplaćeno (gotovina)", value: formatRsd(summary.totalCashTopUpRsd) },
    { label: "Dopuna", value: String(summary.topUpCount) },
    { label: "Aktivacija", value: String(summary.activationsCount) },
    { label: "Studenata", value: String(summary.uniqueStudentsCount) },
    { label: "Produženje", value: String(summary.extensionsCount) },
    { label: "Blokada", value: String(summary.blocksCount) },
  ];

  function handleExportCsv() {
    const csv = generateCsv(summary, breakdown);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emenza-istorija-${period}-${referenceDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="referent-report-print space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter po tipu akcije"
            className={staffButtonSecondaryClass + " cursor-pointer appearance-none px-3 py-2"}
            onChange={(event) =>
              setActionFilter(event.target.value as ReferentActionType | "all")
            }
            value={actionFilter}
          >
            {actionTypeFilter.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            className={staffButtonSecondaryClass + " inline-flex items-center gap-2"}
            onClick={handleExportCsv}
            type="button"
          >
            <Download aria-hidden="true" size={16} />
            CSV
          </button>
          <button
            className={staffButtonSecondaryClass + " inline-flex items-center gap-2"}
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" size={16} />
            Štampaj
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 print:hidden">
        <button
          aria-label="Prethodni period"
          className={staffButtonSecondaryClass + " !px-3 !py-2"}
          onClick={() => setReferenceDate((prev) => shiftDateKey(prev, period, -1))}
          type="button"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[200px] text-center text-sm font-semibold text-[var(--text-primary)]">
          {summary.label}
        </span>
        <button
          aria-label="Sledeći period"
          className={staffButtonSecondaryClass + " !px-3 !py-2"}
          onClick={() => setReferenceDate((prev) => shiftDateKey(prev, period, 1))}
          type="button"
        >
          <ChevronRight size={18} />
        </button>
        {referenceDate !== todayKey ? (
          <button
            className="text-xs font-semibold text-[#5055D2] hover:underline"
            onClick={() => setReferenceDate(todayKey)}
            type="button"
          >
            Danas
          </button>
        ) : null}
      </div>

      <header className="hidden border-b border-black/10 pb-4 print:block">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">eMenza</p>
        <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
          {actionFilter === "all" ? periodReportTitles[period] : `${actionLabels[actionFilter]} — ${periodReportTitles[period]}`}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Period: {summary.label}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Štampano: {formatPrintedAt()}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-3 print:gap-3">
        {kpiCards.map((card) => (
          <StaffCard key={card.label} padding="md">
            <p className="text-xl font-extrabold tabular-nums text-[var(--text-primary)] print:text-lg">
              {card.value}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{card.label}</p>
          </StaffCard>
        ))}
      </div>

      {breakdown.length > 0 ? (
        <StaffCard padding="md">
          <div className="border-b px-0 pb-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {period === "year" ? "Pregled po mesecima" : "Pregled po danima"}
            </h2>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <StaffTable>
              <StaffTableHead>
                <tr className="bg-[var(--bg-muted)] text-xs uppercase tracking-wide text-[var(--text-muted)] print:bg-transparent">
                  <th className="px-5 py-3 font-semibold print:px-2 print:py-2">Period</th>
                  <th className="px-5 py-3 font-semibold print:px-2 print:py-2">Uplaćeno</th>
                  <th className="px-5 py-3 font-semibold print:px-2 print:py-2">Dopune</th>
                  <th className="px-5 py-3 font-semibold print:px-2 print:py-2">Aktivacije</th>
                  <th className="px-5 py-3 font-semibold print:px-2 print:py-2">Studenti</th>
                  <th className="px-5 py-3 font-semibold print:px-2 print:py-2">Produženja</th>
                  <th className="px-5 py-3 font-semibold print:px-2 print:py-2">Blokade</th>
                </tr>
              </StaffTableHead>
              <StaffTableBody>
                {breakdown.map((row) => (
                  <tr className="border-t" key={row.dateKey}>
                    <td className="px-5 py-3 font-medium print:px-2 print:py-2">{row.label}</td>
                    <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)] print:px-2 print:py-2">
                      {formatRsd(row.totalCashTopUpRsd)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)] print:px-2 print:py-2">{row.topUpCount}</td>
                    <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)] print:px-2 print:py-2">{row.activationsCount}</td>
                    <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)] print:px-2 print:py-2">
                      {row.uniqueStudentsCount}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)] print:px-2 print:py-2">{row.extensionsCount}</td>
                    <td className="px-5 py-3 tabular-nums text-[var(--text-secondary)] print:px-2 print:py-2">{row.blocksCount}</td>
                  </tr>
                ))}
              </StaffTableBody>
            </StaffTable>
          </div>
        </StaffCard>
      ) : null}

      <StaffCard
        description={`Hronološka istorija akcija: ${summary.label}.`}
        title="Istorija akcija"
      >
        {filteredLogs.length === 0 ? (
          <p className="rounded-xl bg-[#EFF1F4]/70 px-4 py-3 text-sm text-black/55">
            Nema zabeleženih akcija za izabrani period i filter.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredLogs.map((log) => {
              const card = cardById.get(log.cardId);
              const Icon = actionIcon(log.action);
              const isTopUp = log.action === "top_up";

              return (
                <li
                  className="group flex items-center gap-4 rounded-2xl border border-black/[0.05] bg-[var(--bg-primary)]/70 px-4 py-4 transition-colors hover:bg-[var(--bg-primary)]"
                  key={log.id}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${actionStyle(log.action).solid}`}
                  >
                    <Icon aria-hidden="true" size={22} />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${actionStyle(log.action).chip}`}>
                        {actionLabels[log.action]}
                      </span>
                      {log.reversed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-700">
                          <RotateCcw aria-hidden="true" size={12} />
                          Opozvano
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-base font-bold leading-tight text-black/90">
                        {card?.studentName || "Nepoznat student"}
                      </span>
                      {card ? (
                        <span className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-black/40">
                          {card.cardNumber.slice(-4)}
                        </span>
                      ) : null}
                    </div>

                    {log.detail ? (
                      <p className="text-sm text-black/60">{log.detail}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/45">
                      <span className="inline-flex items-center gap-1">
                        <Clock aria-hidden="true" size={12} />
                        {formatDateTime(log.at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Shield aria-hidden="true" size={12} />
                        {log.referentName}
                      </span>
                      {card ? (
                        <a
                          className="inline-flex items-center gap-1 font-semibold text-[#5055D2] opacity-80 transition-opacity hover:opacity-100 hover:underline"
                          href={`/referent/kartice/${card.id}`}
                        >
                          Otvori karticu
                          <ArrowUpRight aria-hidden="true" size={12} />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {isTopUp ? (
                    <span className="shrink-0 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/70 px-5 py-3 text-[28px] font-extrabold leading-none tabular-nums text-blue-700 ring-1 ring-blue-600/10">
                      +{formatRsd(log.amountRsd ?? 0)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </StaffCard>
    </div>
  );
}

export default ReferentHistoryPage;
