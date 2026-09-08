import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { StaffCard, StaffSegmentedControl, staffInputClass } from "@/components/staff";
import { apiGet } from "@/lib/api/client";
import type { MonitoringResponse, Granularity, ReservationDailyPoint, ReservationSummary, DiffValue } from "./types";
import { granularityOptions, fmtShort, fmtDate, SectionCard, TableWrap, SortTh, getWeekRange, getYearRange, getMultiYearRange, addDays, MONTH_NAMES, formatDateStr } from "./shared";

type TablePoint = {
  label: string;
  date: string;
  total: number;
  pickedUp: number;
  missed: number;
  utilization: number;
};

type Props = {
  data: MonitoringResponse;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
  startDate1: string;
  from1: string;
  to1: string;
  from2: string;
  to2: string;
  compareEnabled: boolean;
};

function aggregateWeekly(daily: ReservationDailyPoint[]): TablePoint[] {
  const weeks = new Map<string, ReservationDailyPoint[]>();
  for (const p of daily) {
    const monday = (() => {
      const d = new Date(p.date + "T00:00:00");
      const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      return formatDateStr(d);
    })();
    if (!weeks.has(monday)) weeks.set(monday, []);
    weeks.get(monday)!.push(p);
  }
  return Array.from(weeks.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([monday, pts]) => {
    const total = pts.reduce((s, p) => s + p.total, 0);
    const pickedUp = pts.reduce((s, p) => s + p.pickedUp, 0);
    const missed = pts.reduce((s, p) => s + p.missed, 0);
    const sunday = addDays(monday, 6);
    return {
      label: `${fmtShort(monday)}–${fmtShort(sunday)}`,
      date: monday,
      total,
      pickedUp,
      missed,
      utilization: total > 0 ? Math.round((pickedUp / total) * 100) : 0,
    };
  });
}

function aggregateMonthly(daily: ReservationDailyPoint[], year: number): TablePoint[] {
  const months = new Map<number, ReservationDailyPoint[]>();
  for (const p of daily) {
    const m = new Date(p.date + "T00:00:00").getMonth();
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(p);
  }
  return Array.from({ length: 12 }, (_, i) => i).map((m) => {
    const pts = months.get(m) ?? [];
    const total = pts.reduce((s, p) => s + p.total, 0);
    const pickedUp = pts.reduce((s, p) => s + p.pickedUp, 0);
    const missed = pts.reduce((s, p) => s + p.missed, 0);
    return {
      label: MONTH_NAMES[m],
      date: `${year}-${String(m + 1).padStart(2, "0")}-01`,
      total,
      pickedUp,
      missed,
      utilization: total > 0 ? Math.round((pickedUp / total) * 100) : 0,
    };
  });
}

function aggregateYearly(daily: ReservationDailyPoint[], yearsBack: number = 7): TablePoint[] {
  const currentYear = new Date().getFullYear();
  const yearData = new Map<number, ReservationDailyPoint[]>();
  for (const p of daily) {
    const y = new Date(p.date + "T00:00:00").getFullYear();
    if (!yearData.has(y)) yearData.set(y, []);
    yearData.get(y)!.push(p);
  }
  return Array.from({ length: yearsBack + 1 }, (_, i) => currentYear - yearsBack + i).map((y) => {
    const pts = yearData.get(y) ?? [];
    const total = pts.reduce((s, p) => s + p.total, 0);
    const pickedUp = pts.reduce((s, p) => s + p.pickedUp, 0);
    const missed = pts.reduce((s, p) => s + p.missed, 0);
    return {
      label: String(y),
      date: `${y}-01-01`,
      total,
      pickedUp,
      missed,
      utilization: total > 0 ? Math.round((pickedUp / total) * 100) : 0,
    };
  });
}

export function RezervacijeTab({
  data,
  granularity,
  setGranularity,
  startDate1,
  from1,
  to1,
  from2,
  to2,
  compareEnabled,
}: Props) {
  const [resSortField, setResSortField] = useState<"date" | "total" | "pickedUp" | "missed" | "utilization">("date");
  const [resSortDir, setResSortDir] = useState<"asc" | "desc">("asc");
  const [tableData, setTableData] = useState<TablePoint[] | null>(null);

  useEffect(() => {
    let from: string;
    let to: string;

    if (granularity === "dan") {
      const range = getWeekRange(startDate1);
      from = range.from;
      to = range.to;
    } else if (granularity === "mesec") {
      const range = getYearRange(startDate1);
      from = range.from;
      to = range.to;
    } else if (granularity === "godina") {
      const range = getMultiYearRange(7);
      from = range.from;
      to = range.to;
    } else {
      setTableData(null);
      return;
    }

    apiGet<MonitoringResponse>(`/api/admin/monitoring?from=${from}&to=${to}`)
      .then((result) => {
        if (granularity === "dan") {
          setTableData(aggregateWeekly(result.reservationTrend));
        } else if (granularity === "mesec") {
          const year = new Date(startDate1 + "T00:00:00").getFullYear();
          setTableData(aggregateMonthly(result.reservationTrend, year));
        } else {
          setTableData(aggregateYearly(result.reservationTrend));
        }
      })
      .catch(() => setTableData(null));
  }, [granularity, startDate1]);

  const tableTitle = granularity === "dan" ? "Nedeljni pregled rezervacija"
    : granularity === "mesec" ? "Mesečni pregled rezervacija"
    : granularity === "godina" ? "Godišnji pregled rezervacija"
    : "Pregled rezervacija";

  const dateLabel = granularity === "dan" ? "Nedelja"
    : granularity === "mesec" ? "Mesec"
    : granularity === "godina" ? "Period"
    : "Period";

  return (
    <div className="space-y-4">
      <StaffCard padding="md">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Trajanje:</span>
            <StaffSegmentedControl options={granularityOptions} value={granularity} onChange={setGranularity} />
          </div>
          <div className="hidden sm:block h-6 w-px bg-[var(--card-border)]" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-primary)] px-2 py-1 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
              {dateLabel} <span className="text-xs font-normal text-[var(--text-muted)]">{fmtShort(from1)}–{fmtShort(to1)}</span>
            </span>
            <input className={staffInputClass + " w-32"} type="date" defaultValue={from1} />
          </div>
        </div>
      </StaffCard>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StaffCard padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ukupno rezervacija</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{data.reservationSummary.total.toLocaleString("sr-RS")}</p>
        </StaffCard>
        <StaffCard padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Preuzeto</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{data.reservationSummary.pickedUp.toLocaleString("sr-RS")}</p>
        </StaffCard>
        <StaffCard padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Propušteno</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{data.reservationSummary.missed.toLocaleString("sr-RS")}</p>
        </StaffCard>
        <StaffCard padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Iskorišćenost</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{data.reservationSummary.utilization}%</p>
        </StaffCard>
      </div>

      {/* Chart row */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <SectionCard title="Rezervacije kroz vreme">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.reservationTrend}>
                  <defs>
                    <linearGradient id="rg-total" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="rg-picked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend formatter={(v: string) => <span className="text-xs text-[var(--text-primary)]">{v === "total" ? "Ukupno" : v === "pickedUp" ? "Preuzeto" : v}</span>} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#rg-total)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="pickedUp" stroke="#10b981" fill="url(#rg-picked)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div className="lg:w-[360px] shrink-0 flex flex-col gap-4">
          <SectionCard title="Preuzeto vs Neiskorišćeno">
            <div className="flex items-center justify-center h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      const donut: { name: string; value: number }[] = [];
                      if (data.reservationSummary.pickedUp > 0) donut.push({ name: "Preuzeto", value: data.reservationSummary.pickedUp });
                      if (data.reservationSummary.missed > 0) donut.push({ name: "Propušteno", value: data.reservationSummary.missed });
                      const other = data.reservationSummary.total - data.reservationSummary.pickedUp - data.reservationSummary.missed;
                      if (other > 0) donut.push({ name: "Ostalo", value: other });
                      return donut;
                    })()}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={70}
                    dataKey="value" nameKey="name"
                    paddingAngle={3}
                  >
                    {(["#10b981", "#ef4444", "#f59e0b"] as const).map((color, idx) => (
                      <Cell key={idx} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(v: string) => <span className="text-xs text-[var(--text-primary)]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {compareEnabled && data.reservationPeriod2 && data.reservationDifference && (
            <SectionCard title="Poređenje perioda">
              <TableWrap>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[var(--card-border)]">
                      <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Kategorija</th>
                      <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">A</th>
                      <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">B</th>
                      <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Razlika</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "total", label: "Ukupno" },
                      { key: "pickedUp", label: "Preuzeto" },
                      { key: "missed", label: "Propušteno" },
                    ].map((row) => {
                      const diff = data.reservationDifference?.[row.key] as DiffValue | undefined;
                      if (!diff) return null;
                      const isPos = diff.diff >= 0;
                      return (
                        <tr key={row.key} className="border-b border-[var(--card-border)] last:border-0">
                          <td className="py-2 pr-3 text-sm font-semibold text-[var(--text-primary)]">{row.label}</td>
                          <td className="py-2 pr-3 text-sm text-[var(--text-primary)]">{data.reservationSummary[row.key as keyof ReservationSummary].toLocaleString("sr-RS")}</td>
                          <td className="py-2 pr-3 text-sm text-[var(--text-primary)]">{(data.reservationPeriod2?.[row.key as keyof ReservationSummary] ?? 0).toLocaleString("sr-RS")}</td>
                          <td className="py-2 text-sm">
                            <span className={`text-xs font-semibold ${isPos ? "text-emerald-600" : "text-red-500"}`}>
                              {isPos ? "+" : ""}{diff.diff} ({isPos ? "+" : ""}{diff.percent}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {compareEnabled && (
                  <div className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                    A: {fmtShort(from1)}–{fmtShort(to1)} &middot; B: {fmtShort(from2)}–{fmtShort(to2)}
                  </div>
                )}
              </TableWrap>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Table */}
      <SectionCard title={tableTitle}>
        {tableData === null ? (
          <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
        ) : tableData.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Nema podataka za izabrani period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--card-border)]">
                  <SortTh label={granularity === "mesec" ? "Mesec" : granularity === "godina" ? "Godina" : "Datum"} field="date" current={resSortField} dir={resSortDir} onSort={(f, d) => { setResSortField(f as typeof resSortField); setResSortDir(d); }} />
                  <SortTh label="Ukupno" field="total" current={resSortField} dir={resSortDir} onSort={(f, d) => { setResSortField(f as typeof resSortField); setResSortDir(d); }} />
                  <SortTh label="Preuzeto" field="pickedUp" current={resSortField} dir={resSortDir} onSort={(f, d) => { setResSortField(f as typeof resSortField); setResSortDir(d); }} />
                  <SortTh label="Propušteno" field="missed" current={resSortField} dir={resSortDir} onSort={(f, d) => { setResSortField(f as typeof resSortField); setResSortDir(d); }} />
                  <SortTh label="Iskorišćenost" field="utilization" current={resSortField} dir={resSortDir} onSort={(f, d) => { setResSortField(f as typeof resSortField); setResSortDir(d); }} />
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sorted = [...tableData].sort((a, b) => {
                    const getVal = (item: TablePoint, field: string): number => {
                      if (field === "date") return new Date(item.date).getTime();
                      if (field === "utilization") return item.utilization;
                      return item[field as "total" | "pickedUp" | "missed"] as number;
                    };
                    const va = getVal(a, resSortField);
                    const vb = getVal(b, resSortField);
                    return resSortDir === "asc" ? va - vb : vb - va;
                  });
                  return sorted.map((row) => (
                    <tr key={row.date} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">{row.label}</td>
                      <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">{row.total.toLocaleString("sr-RS")}</td>
                      <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">{row.pickedUp.toLocaleString("sr-RS")}</td>
                      <td className={`px-4 py-2.5 text-sm ${row.missed > 0 ? "text-red-500" : "text-[var(--text-primary)]"}`}>{row.missed.toLocaleString("sr-RS")}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden min-w-[50px] max-w-[100px]">
                            <div className={`h-full rounded-full ${row.utilization > 85 ? "bg-emerald-500" : row.utilization >= 60 ? "bg-amber-500" : row.utilization >= 30 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${row.utilization}%` }} />
                          </div>
                          <span className="text-sm text-[var(--text-primary)] whitespace-nowrap">{row.utilization}%</span>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--card-border)]">
                  <td className="px-4 py-2.5 text-sm font-bold text-[var(--text-primary)]">UKUPNO</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-[var(--text-primary)]">{tableData.reduce((s, r) => s + r.total, 0).toLocaleString("sr-RS")}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-[var(--text-primary)]">{tableData.reduce((s, r) => s + r.pickedUp, 0).toLocaleString("sr-RS")}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-red-500">{tableData.reduce((s, r) => s + r.missed, 0).toLocaleString("sr-RS")}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-[var(--text-primary)]">{(() => {
                    const t = tableData.reduce((s, r) => s + r.total, 0);
                    const p = tableData.reduce((s, r) => s + r.pickedUp, 0);
                    return t > 0 ? `${Math.round((p / t) * 100)}%` : "—";
                  })()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
