"use client";

import { useMemo, useState } from "react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { updateComplaintStatus, deleteComplaintEntry, replyToComplaint } from "@/lib/admin-system-store";
import { loadReferentCardsState } from "@/lib/referent-cards-store";
import {
  COMPLAINT_CATEGORY_LABELS,
  type ComplaintCategory,
  type ComplaintStatus,
  type FileAttachment,
} from "@/lib/admin-system-mock";
import {
  StaffCard,
  StaffConfirmDialog,
  StaffSegmentedControl,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
} from "@/components/staff";
import { useToast } from "@/components/shared/toast/useToast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { BarChart3, Download, FileText, Trash2, Eye, Reply, X } from "lucide-react";

const STATUS_OPTIONS: { id: ComplaintStatus | "sve"; label: string }[] = [
  { id: "sve", label: "Sve" },
  { id: "novo", label: "Novo" },
  { id: "pregledano", label: "Pregledano" },
  { id: "reseno", label: "Rešeno" },
];

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  novo: "bg-amber-100 text-amber-700",
  pregledano: "bg-blue-100 text-blue-700",
  reseno: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  novo: "Novo",
  pregledano: "Pregledano",
  reseno: "Rešeno",
};

const CATEGORY_COLORS: Record<ComplaintCategory, string> = {
  hrana: "#F59E0B",
  usluga: "#3B82F6",
  higijena: "#10B981",
  tehnicki_problem: "#8B5CF6",
  drugo: "#6B7280",
};

type Period = "day" | "week" | "month" | "year";

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: "day", label: "Danas" },
  { id: "week", label: "Nedelja" },
  { id: "month", label: "Mesec" },
  { id: "year", label: "Godina" },
];

function periodCutoff(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      return monday;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

export function AdminZalbePage() {
  const { state, refresh } = useAdminSystem({ scope: "full" });
  const [filter, setFilter] = useState<ComplaintStatus | "sve">("sve");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [showStats, setShowStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<Period>("month");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const items = useMemo(
    () =>
      filter === "sve"
        ? state.complaintEntries
        : state.complaintEntries.filter((c) => c.status === filter),
    [state.complaintEntries, filter],
  );

  const todayNewCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return state.complaintEntries.filter(
      (c) => c.status === "novo" && new Date(c.submittedAt).getTime() >= today.getTime(),
    ).length;
  }, [state.complaintEntries]);

  const stats = useMemo(() => {
    const cutoff = periodCutoff(statsPeriod).getTime();
    const filtered = state.complaintEntries.filter(
      (e) => new Date(e.submittedAt).getTime() >= cutoff,
    );

    const total = filtered.length;
    const pregledano = filtered.filter((e) => e.status === "pregledano").length;
    const reseno = filtered.filter((e) => e.status === "reseno").length;

    const byCategory: Record<ComplaintCategory, number> = {
      hrana: 0, usluga: 0, higijena: 0, tehnicki_problem: 0, drugo: 0,
    };
    filtered.forEach((e) => { byCategory[e.category]++; });

    const chartData = (Object.keys(byCategory) as ComplaintCategory[]).map((cat) => ({
      name: COMPLAINT_CATEGORY_LABELS[cat],
      value: byCategory[cat],
      category: cat,
    }));

    const topCategory = chartData.reduce((max, curr) => (curr.value > max.value ? curr : max), chartData[0]);

    // Student participation
    const allCards = loadReferentCardsState().cards;
    const totalRegistered = allCards.length;
    const totalStudents = allCards.filter((c) => c.role === "student").length;
    const totalUcenici = allCards.filter((c) => c.role === "ucenik").length;

    const uniqueComplainantEmails = new Set(filtered.map((e) => e.email.toLowerCase()));
    const uniqueComplainants = uniqueComplainantEmails.size;

    const complainantCards = allCards.filter((c) => uniqueComplainantEmails.has(c.email.toLowerCase()));
    const studentComplainants = complainantCards.filter((c) => c.role === "student").length;
    const ucenikComplainants = complainantCards.filter((c) => c.role === "ucenik").length;

    const participationData = [
      { name: "Poslalo žalbu", value: uniqueComplainants, color: "#5055D2" },
      { name: "Nije poslalo žalbu", value: Math.max(0, totalRegistered - uniqueComplainants), color: "#E5E7EB" },
    ];

    return {
      total, pregledano, reseno, chartData, topCategory, cutoff, filtered,
      uniqueComplainants, totalRegistered, totalStudents, totalUcenici,
      studentComplainants, ucenikComplainants, participationData,
    };
  }, [state.complaintEntries, statsPeriod]);

  function exportCsv() {
    const rows = [["Ime", "Email", "Kategorija", "Status", "Datum", "Poruka", "Odgovor admina"]];
    stats.filtered.forEach((e) => {
      rows.push([
        e.name,
        e.email,
        COMPLAINT_CATEGORY_LABELS[e.category],
        STATUS_LABELS[e.status],
        e.date,
        e.message,
        e.adminReply || "",
      ]);
    });

    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zalbe-izvestaj-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportTxt() {
    const periodLabel = PERIOD_OPTIONS.find((p) => p.id === statsPeriod)?.label || "Mesec";
    const lines: string[] = [
      "=== IZVEŠTAJ O ŽALBAMA ===",
      `Period: ${periodLabel}`,
      `Datum izvoza: ${new Date().toLocaleDateString("sr-RS")}`,
      "",
      "--- SUMARNI PREGLED ---",
      `Ukupno pristiglo: ${stats.total}`,
      `Pregledano: ${stats.pregledano} (${stats.total > 0 ? Math.round((stats.pregledano / stats.total) * 100) : 0}%)`,
      `Rešeno: ${stats.reseno} (${stats.total > 0 ? Math.round((stats.reseno / stats.total) * 100) : 0}%)`,
      "",
      "--- PO KATEGORIJAMA ---",
    ];
    stats.chartData.forEach((row) => {
      lines.push(`${row.name}: ${row.value} (${stats.total > 0 ? Math.round((row.value / stats.total) * 100) : 0}%)`);
    });
    lines.push("", "--- SVE ŽALBE ---");
    stats.filtered.forEach((e) => {
      lines.push("");
      lines.push(`Kategorija: ${COMPLAINT_CATEGORY_LABELS[e.category]}`);
      lines.push(`Status: ${STATUS_LABELS[e.status]}`);
      lines.push(`Student: ${e.name} (${e.email})`);
      lines.push(`Datum: ${e.date}`);
      lines.push(`Poruka: ${e.message}`);
      if (e.adminReply) lines.push(`Odgovor: ${e.adminReply}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zalbe-izvestaj-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <StaffCard
        title="Žalbe studenata"
        actions={
          <div className="flex items-center gap-2">
            <StaffSegmentedControl
              options={STATUS_OPTIONS}
              value={filter}
              onChange={(v) => setFilter(v as ComplaintStatus | "sve")}
            />
            {todayNewCount > 0 && filter !== "novo" ? (
              <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {todayNewCount} novo
              </span>
            ) : null}
            <button
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                showStats
                  ? "bg-[#5055D2] text-white shadow-sm"
                  : "border border-[var(--card-border)] text-[var(--text-tertiary)] hover:border-[#5055D2]/30 hover:text-[#5055D2]"
              }`}
              onClick={() => setShowStats((v) => !v)}
              type="button"
            >
              <BarChart3 size={14} />
              Statistika
            </button>
          </div>
        }
      />

      {/* Stats panel */}
      {showStats && (
        <div className="space-y-4">
          <StaffCard padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StaffSegmentedControl
                options={PERIOD_OPTIONS}
                value={statsPeriod}
                onChange={(v) => setStatsPeriod(v as Period)}
              />
              <div className="flex items-center gap-2">
                <button
                  className={staffButtonSecondaryClass}
                  onClick={exportCsv}
                  type="button"
                >
                  <Download size={14} />
                  CSV
                </button>
                <button
                  className={staffButtonSecondaryClass}
                  onClick={exportTxt}
                  type="button"
                >
                  <FileText size={14} />
                  TXT izveštaj
                </button>
              </div>
            </div>
          </StaffCard>

          <div className="grid grid-cols-3 gap-4">
            <StaffCard padding="md">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Pristiglo</p>
              <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                {stats.topCategory.value > 0
                  ? `Najviše: ${stats.topCategory.name} (${stats.topCategory.value})`
                  : "Nema žalbi u ovom periodu"}
              </p>
            </StaffCard>
            <StaffCard padding="md">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Pregledano</p>
              <p className="mt-1 text-3xl font-bold text-blue-600">{stats.pregledano}</p>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                {stats.total > 0 ? `${Math.round((stats.pregledano / stats.total) * 100)}%` : "—"}
              </p>
            </StaffCard>
            <StaffCard padding="md">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Rešeno</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">{stats.reseno}</p>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                {stats.total > 0 ? `${Math.round((stats.reseno / stats.total) * 100)}%` : "—"}
              </p>
            </StaffCard>
          </div>

          <StaffCard title="Po kategorijama">
            {stats.chartData.every((d) => d.value === 0) ? (
              <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">Nema podataka za izabrani period.</p>
            ) : (
              <div className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart
                      barCategoryGap="30%"
                      data={stats.chartData}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <XAxis axisLine={false} dataKey="name" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 13 }}
                        formatter={(value) => [value, "Žalbi"]}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {stats.chartData.map((entry) => (
                          <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-hidden rounded-xl border border-[var(--card-border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                        <th className="px-4 py-2.5 text-left">Kategorija</th>
                        <th className="px-4 py-2.5 text-right">Broj žalbi</th>
                        <th className="px-4 py-2.5 text-right">Udeo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.chartData.map((row) => (
                        <tr key={row.category} className="border-t border-[var(--card-border)]">
                          <td className="flex items-center gap-2 px-4 py-2.5 text-[var(--text-primary)]">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[row.category] }} />
                            {row.name}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{row.value}</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                            {stats.total > 0 ? `${Math.round((row.value / stats.total) * 100)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </StaffCard>

          <StaffCard title="Učešće studenata">
            {stats.totalRegistered === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-tertiary)]">Nema registrovanih korisnika.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <StaffCard padding="md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Registrovano</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{stats.totalRegistered}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {stats.totalStudents} studenata · {stats.totalUcenici} učenika
                    </p>
                  </StaffCard>
                  <StaffCard padding="md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Poslalo žalbu</p>
                    <p className="mt-1 text-3xl font-bold text-[#5055D2]">{stats.uniqueComplainants}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {stats.totalRegistered > 0 ? `${Math.round((stats.uniqueComplainants / stats.totalRegistered) * 100)}% od registrovanih` : "—"}
                    </p>
                  </StaffCard>
                  <StaffCard padding="md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Nije poslalo žalbu</p>
                    <p className="mt-1 text-3xl font-bold text-[#9CA3AF]">{stats.totalRegistered - stats.uniqueComplainants}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {stats.totalRegistered > 0 ? `${Math.round(((stats.totalRegistered - stats.uniqueComplainants) / stats.totalRegistered) * 100)}% od registrovanih` : "—"}
                    </p>
                  </StaffCard>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Pie chart */}
                  <div className="flex h-64 items-center justify-center">
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie
                          cx="50%"
                          cy="50%"
                          data={stats.participationData}
                          dataKey="value"
                          endAngle={-270}
                          innerRadius={60}
                          nameKey="name"
                          outerRadius={90}
                          startAngle={90}
                        >
                          {stats.participationData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 13 }}
                          formatter={(value, name) => [value, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Breakdown by role */}
                  <div className="overflow-hidden rounded-xl border border-[var(--card-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--bg-secondary)] text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                          <th className="px-4 py-2.5 text-left">Kategorija</th>
                          <th className="px-4 py-2.5 text-right">Registrovano</th>
                          <th className="px-4 py-2.5 text-right">Poslalo žalbu</th>
                          <th className="px-4 py-2.5 text-right">Učešće</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-[var(--card-border)]">
                          <td className="flex items-center gap-2 px-4 py-2.5 text-[var(--text-primary)]">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5055D2]" />
                            Studenti
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{stats.totalStudents}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{stats.studentComplainants}</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                            {stats.totalStudents > 0 ? `${Math.round((stats.studentComplainants / stats.totalStudents) * 100)}%` : "—"}
                          </td>
                        </tr>
                        <tr className="border-t border-[var(--card-border)]">
                          <td className="flex items-center gap-2 px-4 py-2.5 text-[var(--text-primary)]">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#F59E0B]" />
                            Učenici
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{stats.totalUcenici}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--text-primary)]">{stats.ucenikComplainants}</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                            {stats.totalUcenici > 0 ? `${Math.round((stats.ucenikComplainants / stats.totalUcenici) * 100)}%` : "—"}
                          </td>
                        </tr>
                        <tr className="border-t border-[var(--card-border)] font-semibold">
                          <td className="flex items-center gap-2 px-4 py-2.5 text-[var(--text-primary)]">Ukupno</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{stats.totalRegistered}</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{stats.uniqueComplainants}</td>
                          <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">
                            {stats.totalRegistered > 0 ? `${Math.round((stats.uniqueComplainants / stats.totalRegistered) * 100)}%` : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </StaffCard>
        </div>
      )}

      {/* Complaints list */}
      {todayNewCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          Imate {todayNewCount} {todayNewCount === 1 ? "novu žalbu" : "novih žalbi"} danas
        </div>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">Nema žalbi.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((entry) => (
            <StaffCard key={entry.id} padding="sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{entry.name}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <span>{entry.date}</span>
                      <span>·</span>
                      <span>{entry.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[entry.status]}`}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <span className="rounded-full bg-[#5055D2]/10 px-2 py-0.5 text-xs font-semibold text-[#5055D2]">
                    {COMPLAINT_CATEGORY_LABELS[entry.category]}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-sm text-[var(--text-secondary)]">{entry.message}</p>

              {entry.fileAttachment && <AdminAttachmentPreview attachment={entry.fileAttachment} />}

              {entry.adminReply && (
                <div className="mt-2 rounded-lg bg-[#5055D2]/5 px-3 py-2 text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[#5055D2]">Odgovor: </span>
                  {entry.adminReply}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--card-border)] pt-3">
                {entry.status === "novo" && (
                  <button
                    className={staffButtonSecondaryClass}
                    onClick={() => { updateComplaintStatus(entry.id, "pregledano"); refresh(); }}
                    type="button"
                  >
                    <Eye aria-hidden="true" size={14} />
                    Označi pregledano
                  </button>
                )}
                {entry.status !== "reseno" && (
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <input
                      className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs outline-none focus:border-[#5055D2] min-w-[160px]"
                      placeholder="Odgovor studentu..."
                      value={replyText[entry.id] ?? ""}
                      onChange={(e) => setReplyText((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                    />
                    <button
                      className={staffButtonPrimaryClass}
                      disabled={!replyText[entry.id]?.trim()}
                      onClick={() => {
                        if (!replyText[entry.id]?.trim()) return;
                        replyToComplaint(entry.id, replyText[entry.id].trim());
                        setReplyText((prev) => ({ ...prev, [entry.id]: "" }));
                        refresh();
                      }}
                      type="button"
                    >
                      <Reply aria-hidden="true" size={14} />
                      Odgovori
                    </button>
                  </div>
                )}
                <button
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                  onClick={() => setDeleteTarget({ id: entry.id, label: entry.name })}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={13} />
                  Obriši
                </button>
              </div>
            </StaffCard>
          ))}
        </ul>
      )}

      <StaffConfirmDialog
        open={Boolean(deleteTarget)}
        title="Obriši žalbu"
        message={`Da li ste sigurni da želite da obrišete žalbu "${deleteTarget?.label ?? ""}"?`}
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteComplaintEntry(deleteTarget.id);
            refresh();
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AdminAttachmentPreview({ attachment }: { attachment: FileAttachment }) {
  const isImage = attachment.type.startsWith("image/");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-secondary)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5055D2]/10">
          {isImage ? (
            <img alt={attachment.name} className="h-5 w-5 rounded object-cover" src={attachment.data} />
          ) : (
            <FileText size={14} className="text-[#5055D2]" />
          )}
        </div>
        <span className="flex-1 truncate text-[var(--text-secondary)]">{attachment.name}</span>
        <FileText size={14} className="shrink-0 text-[var(--text-tertiary)]" />
      </button>

      {open && isImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-colors hover:bg-red-50 hover:text-red-500" onClick={() => setOpen(false)} type="button"><X size={16} /></button>
            <img alt={attachment.name} className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" src={attachment.data} />
          </div>
        </div>
      )}

      {open && !isImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <FileText size={40} className="text-[#5055D2]" />
            <p className="text-center font-semibold text-[var(--text-primary)]">{attachment.name}</p>
            <a className="rounded-xl bg-[#5055D2] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4348B8]" download={attachment.name} href={attachment.data}>Preuzmi fajl</a>
            <button className="text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]" onClick={() => setOpen(false)} type="button">Zatvori</button>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminZalbePage;