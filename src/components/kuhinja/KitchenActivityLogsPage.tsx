"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchKitchenActivityLogs } from "@/lib/backend/activity-logs-api";
import type { ActivityLogEntry } from "@/server/repositories/activity-logs";
import {
  Activity,
  Ban,
  CalendarCheck,
  ClipboardList,
  Megaphone,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  staffInputClass,
  StaffCard,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
} from "@/components/staff";

type DiaryGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  types: { value: string; label: string }[];
};

const DIARY_GROUPS: DiaryGroup[] = [
  {
    id: "staff",
    label: "Nalozi",
    icon: Ban,
    types: [
      { value: "staff.suspend", label: "Suspendovan" },
      { value: "staff.reactivate", label: "Ponovo aktiviran" },
      { value: "staff.role_change", label: "Promenjena uloga" },
      { value: "staff.create", label: "Kreiran nalog" },
      { value: "staff.delete", label: "Obrisan nalog" },
    ],
  },
  {
    id: "menu",
    label: "Jelovnik / spiskovi",
    icon: ClipboardList,
    types: [
      { value: "menu.slot.update", label: "Izmenjen termin" },
      { value: "menu.slot.toggle", label: "Preklopljeno jelo" },
      { value: "menu.stock", label: "Promenjen stock" },
      { value: "menu.publish.toggle", label: "Preklopljena objava" },
      { value: "menu.copy", label: "Kopiran meni" },
      { value: "menu.schedule.publish", label: "Objavljen raspored" },
    ],
  },
  {
    id: "dish",
    label: "Jela",
    icon: UtensilsCrossed,
    types: [
      { value: "dish.upsert", label: "Dodato / izmenjeno jelo" },
      { value: "dish.delete", label: "Obrisano jelo" },
    ],
  },
  {
    id: "notice",
    label: "Obaveštenja",
    icon: Megaphone,
    types: [
      { value: "notice.publish", label: "Objavljeno obaveštenje" },
      { value: "notice.archive", label: "Arhivirano obaveštenje" },
    ],
  },
];

const GROUP_TYPES = DIARY_GROUPS.map((g) => g.types.map((t) => t.value));

const ACTION_ICONS: Record<string, LucideIcon> = {
  staff: Ban,
  menu: ClipboardList,
  dish: UtensilsCrossed,
  notice: Megaphone,
  dashboard: Activity,
  reservation: CalendarCheck,
};

const SEVERITY_BY_TYPE: Record<string, "red" | "green" | "amber" | "blue"> = {
  "staff.suspend": "red",
  "dish.delete": "red",
  "staff.reactivate": "green",
  "menu.publish.toggle": "green",
  "menu.schedule.publish": "green",
};

const COLOR_CLASSES: Record<string, string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  green: "bg-green-100 text-green-700 border-green-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
};

function diaryIcon(actionType: string): LucideIcon {
  const prefix = actionType.split(".")[0];
  return ACTION_ICONS[prefix] ?? Activity;
}

function diaryColor(actionType: string): string {
  const severity = SEVERITY_BY_TYPE[actionType] ?? "blue";
  return COLOR_CLASSES[severity];
}

export function KitchenActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [filterRole, setFilterRole] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const derivedTypes = selectedGroups.flatMap((i) => GROUP_TYPES[i] ?? []);

  const fetchData = useCallback(() => {
    const controller = new AbortController();

    fetchKitchenActivityLogs({
      actionTypes: derivedTypes.length > 0 ? derivedTypes : undefined,
      role: filterRole || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      page,
      pageSize,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setLogs(result.logs);
          setTotal(result.total);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLogs([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [derivedTypes, filterRole, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
  }, [fetchData]);

  function toggleGroup(idx: number) {
    setSelectedGroups((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
    setPage(1);
  }

  function selectAll() {
    setSelectedGroups(DIARY_GROUPS.map((_, i) => i));
    setPage(1);
  }

  function clearGroups() {
    setSelectedGroups([]);
    setPage(1);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Uloga</label>
          <select
            className={staffInputClass}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setPage(1);
            }}
            value={filterRole}
          >
            <option value="">Sve uloge</option>
            <option value="admin">Admin</option>
            <option value="kitchen">Kuhinja</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Od</label>
          <input
            className={staffInputClass + " w-36"}
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Do</label>
          <input
            className={staffInputClass + " w-36"}
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {(dateFrom || dateTo) ? (
          <button
            className="mb-0.5 rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            type="button"
          >
            Poništi datum
          </button>
        ) : null}
      </div>

      <StaffCard title="Vrsta akcije">
        <div className="mt-2 flex items-center gap-2">
          <button
            className="rounded-md px-2 py-1 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-muted)]"
            onClick={selectAll}
            type="button"
          >
            Selektuj sve
          </button>
          <span className="text-xs text-[var(--text-tertiary)]">|</span>
          <button
            className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
            onClick={clearGroups}
            type="button"
          >
            Poništi
          </button>
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">{total} stavki</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIARY_GROUPS.map((group, idx) => {
            const active = selectedGroups.includes(idx);
            const Icon = group.icon;
            return (
              <button
                className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[#5055D2] bg-[#5055D2] text-white shadow-sm"
                    : "border-[var(--card-border)] bg-white text-[var(--text-secondary)] hover:border-[#5055D2]/30 hover:text-[var(--text-primary)]"
                }`}
                key={group.id}
                onClick={() => toggleGroup(idx)}
                type="button"
              >
                <Icon size={14} />
                {group.label}
              </button>
            );
          })}
        </div>
      </StaffCard>

      <StaffTable empty={!loading && logs.length === 0} emptyTitle="Nema aktivnosti">
        <StaffTableHead>
          <tr>
            <th className="px-4 py-3">VREME</th>
            <th className="px-4 py-3">KO JE UČINIO</th>
            <th className="px-4 py-3">ULOGA</th>
            <th className="px-4 py-3">TIP</th>
            <th className="px-4 py-3">OPIS</th>
          </tr>
        </StaffTableHead>
        <StaffTableBody>
          {loading
            ? null
            : logs.map((log) => {
                const Icon = diaryIcon(log.actionType);
                const colorClass = diaryColor(log.actionType);
                return (
                  <tr className="border-t staff-table-row" key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-[var(--text-secondary)]">
                      {new Date(log.createdAt).toLocaleString("sr-RS", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {log.userDisplayName ?? (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                      {log.userEmail ? (
                        <span className="ml-1.5 text-[10px] text-[var(--text-tertiary)]">{log.userEmail}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {log.userRole === "admin"
                        ? "Admin"
                        : log.userRole === "kitchen"
                          ? "Kuhinja"
                          : (log.userRole ?? "—")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                        <Icon size={13} />
                        {log.actionType}
                      </span>
                    </td>
                    <td className="max-w-sm truncate px-4 py-3 text-sm text-[var(--text-primary)]">
                      {log.description}
                    </td>
                  </tr>
                );
              })}
        </StaffTableBody>
      </StaffTable>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-30"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            Prethodna
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const pageNum = start + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  page === pageNum
                    ? "bg-[#5055D2] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                }`}
                key={pageNum}
                onClick={() => setPage(pageNum)}
                type="button"
              >
                {pageNum}
              </button>
            );
          })}
          <button
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-30"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            Sledeća
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default KitchenActivityLogsPage;
