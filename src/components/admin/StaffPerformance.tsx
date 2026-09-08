"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import {
  StaffCard,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
} from "@/components/staff";
import { formatRsd, getInitials } from "@/lib/admin-helpers";
import { type ReferentActionLog } from "@/lib/referent-cards-mock";

export type StaffPerformancePeriod = "week" | "month" | "year";

type StaffPerformanceProps = {
  logs: ReferentActionLog[];
  period: StaffPerformancePeriod;
  anchorDateKey: string;
};

const BADGE_COLORS = [
  "bg-[#4f85ff]/10 text-[#4f85ff]",
  "bg-[#85cc87]/30 text-[#2d6b2f]",
  "bg-[#ad9d44]/20 text-[#7a6e2e]",
  "bg-[#e8794f]/10 text-[#c0532e]",
  "bg-[#a78bfa]/10 text-[#7c3aed]",
  "bg-[#f472b6]/10 text-[#be185d]",
];

type ReferentPerformanceRow = {
  referentName: string;
  totalActions: number;
  topUpCount: number;
  topUpRsd: number;
  activationCount: number;
  blockCount: number;
  unblockCount: number;
  extendCount: number;
  refundCount: number;
};

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function inPeriod(at: string, period: StaffPerformancePeriod, anchorDateKey: string): boolean {
  const todayKey = getTodayKey();
  const ref =
    anchorDateKey !== todayKey ? new Date(anchorDateKey + "T00:00:00") : new Date();
  const to = ref;

  let from: Date;
  if (period === "week") {
    const dayOfWeek = (ref.getDay() + 6) % 7;
    from = new Date(ref);
    from.setDate(ref.getDate() - dayOfWeek);
    from.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    from = new Date(ref.getFullYear(), ref.getMonth(), 1);
  } else {
    from = new Date(ref.getFullYear(), 0, 1);
  }

  const t = new Date(at);
  return t >= from && t <= to;
}

export function StaffPerformance({ logs, period, anchorDateKey }: StaffPerformanceProps) {
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");

  const periodLogs = useMemo(
    () => logs.filter((log) => inPeriod(log.at, period, anchorDateKey)),
    [logs, period, anchorDateKey],
  );

  const rows = useMemo<ReferentPerformanceRow[]>(() => {
    const map = new Map<string, ReferentPerformanceRow>();
    for (const log of periodLogs) {
      const row = map.get(log.referentName) ?? {
        referentName: log.referentName,
        totalActions: 0,
        topUpCount: 0,
        topUpRsd: 0,
        activationCount: 0,
        blockCount: 0,
        unblockCount: 0,
        extendCount: 0,
        refundCount: 0,
      };
      row.totalActions += 1;
      if (log.action === "top_up") {
        row.topUpCount += 1;
        row.topUpRsd += log.amountRsd ?? 0;
      } else if (log.action === "activate") {
        row.activationCount += 1;
      } else if (log.action === "block") {
        row.blockCount += 1;
      } else if (log.action === "unblock") {
        row.unblockCount += 1;
      } else if (log.action === "extend") {
        row.extendCount += 1;
      } else if (log.action === "refund") {
        row.refundCount += 1;
      }
      map.set(log.referentName, row);
    }
    return [...map.values()];
  }, [periodLogs]);

  const query = search.trim().toLowerCase();

  const filtered = query ? rows.filter((r) => r.referentName.toLowerCase().includes(query)) : rows;

  const sorted = [...filtered].sort((a, b) =>
    sortDir === "desc"
      ? b.topUpRsd - a.topUpRsd
      : a.topUpRsd - b.topUpRsd,
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.totalActions += r.totalActions;
          acc.topUpCount += r.topUpCount;
          acc.topUpRsd += r.topUpRsd;
          acc.activationCount += r.activationCount;
          acc.blockCount += r.blockCount;
          acc.unblockCount += r.unblockCount;
          acc.extendCount += r.extendCount;
          acc.refundCount += r.refundCount;
          return acc;
        },
        {
          totalActions: 0,
          topUpCount: 0,
          topUpRsd: 0,
          activationCount: 0,
          blockCount: 0,
          unblockCount: 0,
          extendCount: 0,
          refundCount: 0,
        },
      ),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <StaffCard padding="md">
        <p className="text-sm text-[var(--text-secondary)]">
          Nema zabeleženih akcija referenta za izabrani period.
        </p>
      </StaffCard>
    );
  }

  return (
    <StaffCard padding="none">
      <div className="border-b border-[var(--card-border)] px-5 py-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-muted)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-primary)]/30"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretraži po imenu referenta..."
            type="text"
            value={search}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <StaffTable>
          <StaffTableHead>
            <tr className="bg-[var(--bg-muted)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-5 py-3 font-semibold text-left">Referent</th>
              <th className="px-5 py-3 font-semibold text-right">Broj akcija</th>
              <th className="px-5 py-3 font-semibold text-right">Dopune</th>
              <th className="px-5 py-3 font-semibold text-right">
                <button
                  className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  type="button"
                >
                  Ukupno dopuna (RSD)
                  <ArrowUpDown size={13} className="shrink-0" />
                </button>
              </th>
              <th className="px-5 py-3 font-semibold text-right">Aktivacije</th>
              <th className="px-5 py-3 font-semibold text-right">Blokade</th>
              <th className="px-5 py-3 font-semibold text-right">Deblokade</th>
              <th className="px-5 py-3 font-semibold text-right">Produženja</th>
              <th className="px-5 py-3 font-semibold text-right">Refundacije</th>
            </tr>
          </StaffTableHead>
          <StaffTableBody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-8 text-center text-sm text-[var(--text-muted)]"
                  colSpan={9}
                >
                  Nema rezultata za datu pretragu.
                </td>
              </tr>
            ) : (
              sorted.map((row, index) => (
                <tr
                  className="border-t transition-colors hover:bg-[var(--bg-muted)]/40"
                  key={row.referentName}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          BADGE_COLORS[index % BADGE_COLORS.length]
                        }`}
                      >
                        {getInitials(row.referentName)}
                      </span>
                      <span className="font-medium">{row.referentName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                    {row.totalActions}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                    {row.topUpCount}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right font-medium">
                    {formatRsd(row.topUpRsd)}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                    {row.activationCount}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                    {row.blockCount}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                    {row.unblockCount}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                    {row.extendCount}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[var(--text-secondary)]">
                    {row.refundCount}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t-2 border-[var(--text-primary)]/20 bg-[var(--bg-muted)]/50">
              <td className="px-5 py-3 font-bold">Ukupno</td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totals.totalActions}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totals.topUpCount}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {formatRsd(totals.topUpRsd)}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totals.activationCount}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totals.blockCount}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totals.unblockCount}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totals.extendCount}
              </td>
              <td className="px-5 py-3 tabular-nums text-right font-bold">
                {totals.refundCount}
              </td>
            </tr>
          </StaffTableBody>
        </StaffTable>
      </div>
    </StaffCard>
  );
}
