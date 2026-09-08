"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchActivityLogs } from "@/lib/backend/activity-logs-api";
import { searchUsers, type UserSearchResult } from "@/lib/backend/staff-api";
import type { ActivityLogEntry } from "@/server/repositories/activity-logs";
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
  Download,
  LogIn,
  LogOut,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  StaffCard,
  staffInputClass,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
} from "@/components/staff";

type ActionGroup = {
  label: string;
  types: { value: string; label: string }[];
};

const ACTION_GROUPS: ActionGroup[] = [
  {
    label: "Autentifikacija",
    types: [
      { value: "login", label: "Login" },
      { value: "logout", label: "Logout" },
    ],
  },
  {
    label: "Upravljanje menijem",
    types: [
      { value: "dish.upsert", label: "Dodato/Izmenjeno jelo" },
      { value: "menu.slot.update", label: "Izmenjen termin" },
      { value: "menu.slot.toggle", label: "Preklopljeno jelo" },
      { value: "menu.stock", label: "Promenjen stock" },
      { value: "menu.publish.toggle", label: "Preklopljena objava" },
      { value: "menu.schedule.publish", label: "Objavljen raspored" },
      { value: "menu.copy", label: "Kopiran meni" },
    ],
  },
  {
    label: "Rezervacije",
    types: [
      { value: "reservation.create", label: "Kreirana rezervacija" },
      { value: "reservation.cancel", label: "Otkazana rezervacija" },
      { value: "reservation.pickup", label: "Preuzeta rezervacija" },
    ],
  },
  {
    label: "Sistemske promene",
    types: [
      { value: "dish.delete", label: "Obrisano jelo" },
    ],
  },
];

const GROUP_VALUES = ACTION_GROUPS.map((g) => g.types.map((t) => t.value));

const ROLE_OPTIONS = [
  { value: "", label: "Sve uloge" },
  { value: "admin", label: "Admin" },
  { value: "referent", label: "Referent" },
  { value: "kitchen", label: "Kuhinja" },
  { value: "student", label: "Student" },
];

const ACTION_ICONS: Record<string, LucideIcon> = {
  login: LogIn,
  logout: LogOut,
  dish: UtensilsCrossed,
  menu: ClipboardList,
  reservation: CalendarCheck,
};

const CRITICAL_ACTIONS = new Set(["dish.delete", "reservation.cancel"]);

type ActionColor = "blue" | "amber" | "red";

function getActionColor(actionType: string): ActionColor {
  if (actionType === "login" || actionType === "logout") return "blue";
  if (CRITICAL_ACTIONS.has(actionType)) return "red";
  return "amber";
}

const COLOR_CLASSES: Record<ActionColor, string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

function ActionIcon({ actionType, className }: { actionType: string; className?: string }) {
  const prefix = actionType.split(".")[0];
  const Icon = ACTION_ICONS[prefix];
  if (!Icon) return null;
  return <Icon className={className} size={14} />;
}

export function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [filterRole, setFilterRole] = useState("");
  const [loading, setLoading] = useState(true);

  // Date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // User search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchData = useCallback(() => {
    const controller = new AbortController();

    const derivedTypes = selectedGroups.flatMap((i) => GROUP_VALUES[i] ?? []);
    fetchActivityLogs({
      actionTypes: derivedTypes.length > 0 ? derivedTypes : undefined,
      role: filterRole || undefined,
      userId: selectedUser?.id,
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
  }, [selectedGroups, filterRole, selectedUser, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
  }, [fetchData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    setSelectedUser(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 1) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { users } = await searchUsers(value.trim());
        setSearchResults(users);
        setSearchOpen(users.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function selectUser(user: UserSearchResult) {
    setSelectedUser(user);
    setSearchQuery(user.displayName);
    setSearchOpen(false);
    setPage(1);
  }

  function clearUserFilter() {
    setSelectedUser(null);
    setSearchQuery("");
    setPage(1);
  }

  function toggleGroup(groupIdx: number) {
    setSelectedGroups((prev) =>
      prev.includes(groupIdx) ? prev.filter((i) => i !== groupIdx) : [...prev, groupIdx],
    );
    setPage(1);
  }

  function selectAllGroups() {
    setSelectedGroups(ACTION_GROUPS.map((_, i) => i));
    setPage(1);
  }

  function clearGroups() {
    setSelectedGroups([]);
    setPage(1);
  }

  function handleRoleChange(value: string) {
    setFilterRole(value);
    setPage(1);
  }

  function handleDateChange(type: "from" | "to", value: string) {
    if (type === "from") setDateFrom(value);
    else setDateTo(value);
    setPage(1);
  }

  function clearDateRange() {
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  // CSV export
  function exportCSV() {
    const headers = ["Vreme", "Korisnik", "Email", "Uloga", "Tip akcije", "Opis", "IP adresa"];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.userDisplayName ?? "",
      log.userEmail ?? "",
      log.userRole ?? "",
      log.actionType,
      log.description,
      log.ipAddress ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;bom" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">

      {/* Row 1: Search + Role + Date range + Export */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative" ref={searchRef}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Korisnik</label>
          <input
            className={staffInputClass + " w-48"}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Pretraži korisnike..."
            value={searchQuery}
          />
          {searching ? (
            <span className="absolute right-2 bottom-2 text-xs text-[var(--text-tertiary)]">...</span>
          ) : null}
          {selectedUser ? (
            <button
              className="absolute right-2 bottom-2 text-xs text-[var(--text-tertiary)] hover:text-red-500"
              onClick={clearUserFilter}
              type="button"
            >
              ✕
            </button>
          ) : null}
          {searchOpen && searchResults.length > 0 ? (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg">
              {searchResults.map((u) => (
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-muted)]"
                  key={u.id}
                  onClick={() => selectUser(u)}
                  type="button"
                >
                  <span className="font-medium">{u.displayName}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{u.email}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Uloga</label>
          <select
            className={staffInputClass}
            onChange={(e) => handleRoleChange(e.target.value)}
            value={filterRole}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Od</label>
          <input
            className={staffInputClass + " w-36"}
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange("from", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Do</label>
          <input
            className={staffInputClass + " w-36"}
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange("to", e.target.value)}
          />
        </div>

        {(dateFrom || dateTo) ? (
          <button
            className="mb-0.5 rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
            onClick={clearDateRange}
            type="button"
          >
            Poništi datum
          </button>
        ) : null}

        <button
          className="mb-0.5 ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#5055D2] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#3e42b3]"
          onClick={exportCSV}
          type="button"
        >
          <Download size={14} />
          Preuzmi logove
        </button>
      </div>

      {/* Group filter buttons */}
      <StaffCard title="Tip akcije">
        <div className="mt-2 flex items-center gap-2">
          <button
            className="rounded-md px-2 py-1 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-muted)]"
            onClick={selectAllGroups}
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
          {ACTION_GROUPS.map((group, idx) => {
            const active = selectedGroups.includes(idx);
            return (
              <button
                key={group.label}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[#5055D2] bg-[#5055D2] text-white shadow-sm"
                    : "border-[var(--card-border)] bg-white text-[var(--text-secondary)] hover:border-[#5055D2]/30 hover:text-[var(--text-primary)]"
                }`}
                onClick={() => toggleGroup(idx)}
                type="button"
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </StaffCard>

      {/* Table */}
      <StaffTable empty={!loading && logs.length === 0} emptyTitle="Nema aktivnosti">
        <StaffTableHead>
          <tr>
            <th className="px-4 py-3">VREME</th>
            <th className="px-4 py-3">KORISNIK</th>
            <th className="px-4 py-3">IP ADRESA</th>
            <th className="px-4 py-3">ULOGA</th>
            <th className="px-4 py-3">TIP</th>
            <th className="px-4 py-3">OPIS</th>
            <th className="px-4 py-3 w-24" />
          </tr>
        </StaffTableHead>
        <StaffTableBody>
          {loading
            ? null
            : logs.map((log) => {
                const isCritical = CRITICAL_ACTIONS.has(log.actionType);
                const color = getActionColor(log.actionType);
                const colorClass = COLOR_CLASSES[color];

                return (
                  <tr className="border-t staff-table-row" key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        {isCritical ? (
                          <AlertTriangle
                            size={12}
                            className="shrink-0 text-red-500"
                          />
                        ) : null}
                        {new Date(log.createdAt).toLocaleString("sr-RS", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {log.userDisplayName ?? (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                      {log.userEmail ? (
                        <span className="ml-1.5 text-[10px] text-[var(--text-tertiary)]">{log.userEmail}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-tertiary)]">
                      {log.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {log.userRole ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                        <ActionIcon actionType={log.actionType} />
                        {log.actionType}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-[var(--text-primary)]">
                      {log.description}
                    </td>
                    <td className="px-4 py-3">
                      {null}
                    </td>
                  </tr>
                );
              })}
        </StaffTableBody>
      </StaffTable>

      {/* Pagination */}
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

export default AdminLogsPage;
