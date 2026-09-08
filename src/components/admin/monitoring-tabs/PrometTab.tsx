import { UtensilsCrossed } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { StaffCard, StaffSegmentedControl, staffInputClass } from "@/components/staff";
import type { MonitoringResponse, Granularity } from "./types";
import {
  granularityOptions,
  periodLengths,
  fmtShort,
  fmtDate,
  SectionCard,
} from "./shared";

type Props = {
  data: MonitoringResponse;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
  startDate1: string;
  setStartDate1: (v: string) => void;
  startDate2: string;
  from1: string;
  to1: string;
  from2: string;
  to2: string;
  compareEnabled: boolean;
  setCompareEnabled: (v: boolean | ((v: boolean) => boolean)) => void;
  isSingleDay: boolean;
};

type MealCounts = {
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
};

export function PrometTab({
  data,
  granularity,
  setGranularity,
  startDate1,
  setStartDate1,
  startDate2,
  from1,
  to1,
  from2,
  to2,
  compareEnabled,
  setCompareEnabled,
  isSingleDay,
}: Props) {
  return (
    <>
      <StaffCard padding="md">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Trajanje:
            </span>
            <StaffSegmentedControl
              options={granularityOptions}
              value={granularity}
              onChange={setGranularity}
            />
          </div>

          <div className="hidden sm:block h-6 w-px bg-[var(--card-border)]" />

          {!compareEnabled ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-primary)] px-2 py-1 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                Period
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {fmtShort(from1)} – {fmtShort(to1)}
                </span>
              </span>
              <input
                className={staffInputClass + " w-32"}
                type="date"
                value={startDate1}
                onChange={(e) => setStartDate1(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-primary)] px-2 py-1 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                  Period A
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    {fmtShort(from1)} – {fmtShort(to1)}
                  </span>
                </span>
                <input
                  className={staffInputClass + " w-32"}
                  type="date"
                  value={startDate1}
                  onChange={(e) => setStartDate1(e.target.value)}
                />
              </div>

              <div className="hidden sm:block h-6 w-px bg-[var(--card-border)]" />

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-primary)] px-2 py-1 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                  Period B
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    {fmtShort(from2)} – {fmtShort(to2)}
                  </span>
                </span>
                <input
                  className={staffInputClass + " w-32"}
                  type="date"
                  value={startDate2}
                  onChange={(e) => {}}
                />
              </div>
            </>
          )}

          <div className="hidden sm:block h-6 w-px bg-[var(--card-border)]" />

          <button
            type="button"
            onClick={() => setCompareEnabled((v) => !v)}
            className="rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)] whitespace-nowrap"
          >
            {compareEnabled ? "Sakrij poređenje" : "Uporedi periode"}
          </button>
        </div>
      </StaffCard>

      {/* Sekcija A — tip obroka */}
      <SectionCard title="Pregled obroka">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-6">
          {[
            { label: "Doručak", key: "breakfast", color: "#d97706" },
            { label: "Ručak", key: "lunch", color: "#059669" },
            { label: "Večera", key: "dinner", color: "#2563eb" },
            { label: "Ukupno", key: "total", color: "#6b7280" },
          ].map(({ label: lbl, key, color }) => {
            const v1 = data.period1[key as keyof MealCounts] as number;
            const v2 = compareEnabled && data.period2 ? (data.period2[key as keyof MealCounts] as number) : undefined;
            const diff = compareEnabled && data.difference ? data.difference[key] : undefined;
            return (
              <div key={key}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{lbl}</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{v1.toLocaleString("sr-RS")}</p>
                {diff && (
                  <p className={`mt-0.5 text-xs font-medium ${diff.diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {diff.diff >= 0 ? "+" : ""}                    {diff.diff.toLocaleString("sr-RS")} ({diff.percent >= 0 ? "+" : ""}{diff.percent}%)
                  </p>
                )}
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(v1 / data.period1.total) * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
        {compareEnabled && data.period2 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Doručak", A: data.period1.breakfast, B: data.period2.breakfast },
                { name: "Ručak", A: data.period1.lunch, B: data.period2.lunch },
                { name: "Večera", A: data.period1.dinner, B: data.period2.dinner },
              ]} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend formatter={(v: string) => <span className="text-xs text-[var(--text-primary)]">{v === "A" ? "Period A" : "Period B"}</span>} />
                <Bar dataKey="A" name="A" fill="#5055D2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="B" name="B" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : isSingleDay ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyDishTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend formatter={(v: string) => <span className="text-xs text-[var(--text-primary)]">{v === "main" ? "Glavno" : v === "side" ? "Dodatno" : v === "salad" ? "Salata" : v === "dessert" ? "Dezert" : v}</span>} />
                <Bar dataKey="main" name="main" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="side" name="side" fill="#f97316" radius={[2, 2, 0, 0]} />
                <Bar dataKey="salad" name="salad" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="dessert" name="dessert" fill="#ec4899" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTrend}>
                <defs>
                  <linearGradient id="g-breakfast" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d97706" stopOpacity={0.3} /><stop offset="95%" stopColor="#d97706" stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="g-lunch" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.3} /><stop offset="95%" stopColor="#059669" stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="g-dinner" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend formatter={(v: string) => <span className="text-xs text-[var(--text-primary)]">{v === "breakfast" ? "Doručak" : v === "lunch" ? "Ručak" : v === "dinner" ? "Večera" : v}</span>} />
                <Area type="monotone" dataKey="breakfast" stroke="#d97706" fill="url(#g-breakfast)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="lunch" stroke="#059669" fill="url(#g-lunch)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="dinner" stroke="#2563eb" fill="url(#g-dinner)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* Sekcija B — kategorije jela */}
      <SectionCard title="Potrošnja po kategoriji jela">
        {(() => {
          const catTotals = { main: 0, side: 0, salad: 0, dessert: 0, total: 0 };
          for (const d of data.dailyDishTrend) { catTotals.main += d.main; catTotals.side += d.side; catTotals.salad += d.salad; catTotals.dessert += d.dessert; catTotals.total += d.total; }
          const catItems: { label: string; key: keyof typeof catTotals; color: string }[] = [
            { label: "Glavno jelo", key: "main", color: "#6366f1" },
            { label: "Prilog", key: "side", color: "#f97316" },
            { label: "Salata", key: "salad", color: "#22c55e" },
            { label: "Dezert", key: "dessert", color: "#ec4899" },
          ];
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-6">
              {catItems.map(({ label: lbl, key, color }) => {
                const val = catTotals[key];
                return (
                  <div key={key}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{lbl}</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{val.toLocaleString("sr-RS")}</p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(val / catTotals.total) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dailyDishTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend formatter={(v: string) => <span className="text-xs text-[var(--text-primary)]">{v === "main" ? "Glavno" : v === "side" ? "Dodatno" : v === "salad" ? "Salata" : v === "dessert" ? "Dezert" : v}</span>} />
              <Bar dataKey="main" name="main" fill="#6366f1" radius={[2, 2, 0, 0]} />
              <Bar dataKey="side" name="side" fill="#f97316" radius={[2, 2, 0, 0]} />
              <Bar dataKey="salad" name="salad" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="dessert" name="dessert" fill="#ec4899" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </>
  );
}
