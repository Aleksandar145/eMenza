"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  CircleSlash2,
  Clock,
  Coins,
  RefreshCcw,
  RotateCcw,
  Search,
  Shield,
  Undo2,
} from "lucide-react";
import {
  StaffCard,
  StaffConfirmDialog,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
} from "@/components/staff";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useReferentCards } from "@/hooks/useReferentCards";
import { formatRsd } from "@/lib/admin-helpers";
import { toDateKey } from "@/lib/calendar-utils";
import { reverseReferentAction } from "@/lib/referent-cards-store";
import {
  isActionReversible,
  type ReferentActionLog,
  type ReferentActionType,
} from "@/lib/referent-cards-mock";

type FinancePeriod = "all" | "week" | "month" | "year";

const actionLabels: Record<ReferentActionType, string> = {
  activate: "Aktivacija",
  block: "Blokada",
  unblock: "Deblokada",
  top_up: "Dopuna",
  extend: "Produženje",
  refund: "Refundacija",
  reversal: "Opoziv",
};

const actionIconMap: Record<ReferentActionType, typeof Coins> = {
  activate: CheckCircle2,
  block: Ban,
  unblock: Undo2,
  top_up: Coins,
  extend: RefreshCcw,
  refund: CircleSlash2,
  reversal: RotateCcw,
};

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

const periodOptions: { id: FinancePeriod; label: string }[] = [
  { id: "all", label: "Sve" },
  { id: "week", label: "Nedelja" },
  { id: "month", label: "Mesec" },
  { id: "year", label: "Godina" },
];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AdminFinanceHistory() {
  const { state } = useReferentCards();
  const { session } = useAdminSession();
  const [period, setPeriod] = useState<FinancePeriod>("all");
  const [referentFilter, setReferentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reversing, setReversing] = useState<string | null>(null);
  const [pendingReversal, setPendingReversal] = useState<ReferentActionLog | null>(null);

  const cardById = useMemo(() => {
    const map = new Map<string, { studentName: string; cardNumber: string }>();
    for (const card of state.cards) {
      map.set(card.id, { studentName: card.studentName, cardNumber: card.cardNumber });
    }
    return map;
  }, [state.cards]);

  const referents = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const log of state.actionLogs) {
      if (!seen.has(log.referentName)) {
        seen.add(log.referentName);
        list.push(log.referentName);
      }
    }
    return list;
  }, [state.actionLogs]);

  const { nowDate } = useMemo(() => {
    const now = new Date();
    return {
      nowDate: new Date(
        toDateKey({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
        }),
      ),
    };
  }, []);

  const filtered = useMemo(() => {
    return state.actionLogs
      .filter((log) => {
        if (referentFilter !== "all" && log.referentName !== referentFilter) {
          return false;
        }
        if (period !== "all") {
          const logDate = new Date(log.at);
          if (period === "week") {
            const start = new Date(nowDate);
            start.setDate(start.getDate() - 6);
            if (logDate < start) return false;
          } else if (period === "month") {
            const start = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
            if (logDate < start) return false;
          } else if (period === "year") {
            const start = new Date(nowDate.getFullYear(), 0, 1);
            if (logDate < start) return false;
          }
          if (logDate > nowDate) return false;
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const card = cardById.get(log.cardId);
          const matcher = [
            log.referentName,
            log.detail,
            actionLabels[log.action],
            card?.studentName ?? "",
          ]
            .join(" ")
            .toLowerCase();
          if (!matcher.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [state.actionLogs, referentFilter, period, search, cardById, nowDate]);

  return (
    <div className="space-y-5">
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

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter po referentu"
            className={staffButtonSecondaryClass + " cursor-pointer appearance-none px-3 py-2"}
            onChange={(event) => setReferentFilter(event.target.value)}
            value={referentFilter}
          >
            <option value="all">Svi referenti</option>
            {referents.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <StaffCard
        description="Sve transakcije svih referenta, hronološki."
        title="Istorija transakcija"
      >
        <div className="relative mb-4">
          <Search
            aria-hidden="true"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-muted)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-primary)]/30"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pretraži po studentu, referentu ili opisu..."
            type="text"
            value={search}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            Nema transakcija za izabrane filtere.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((log) => {
              const card = cardById.get(log.cardId);
              const Icon = actionIconMap[log.action];
              const isTopUp = log.action === "top_up";
              const style = actionStyle(log.action);

              return (
                <li
                  className="flex items-center gap-4 rounded-2xl border border-black/[0.05] bg-[var(--bg-primary)]/70 px-4 py-4"
                  key={log.id}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${style.solid}`}
                  >
                    <Icon aria-hidden="true" size={22} />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style.chip}`}
                      >
                        {actionLabels[log.action]}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                        <Shield aria-hidden="true" size={12} />
                        {log.referentName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-base font-bold leading-tight text-[var(--text-primary)]">
                        {card?.studentName || "Nepoznat student"}
                      </span>
                      {card ? (
                        <span className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--text-muted)]">
                          {card.cardNumber.slice(-4)}
                        </span>
                      ) : null}
                    </div>

                    {log.detail ? (
                      <p className="text-sm text-[var(--text-secondary)]">{log.detail}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock aria-hidden="true" size={12} />
                        {formatDateTime(log.at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    {log.reversed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-700">
                        <RotateCcw aria-hidden="true" size={12} />
                        Opozvano
                      </span>
                    ) : null}

                    {isActionReversible(log) && !log.reversed ? (
                      <button
                        className={staffButtonSecondaryClass + " gap-1.5 whitespace-nowrap"}
                        disabled={reversing === log.id}
                        onClick={() => setPendingReversal(log)}
                        title={`Opozovi akciju „${actionLabels[log.action]}”`}
                        type="button"
                      >
                        <RotateCcw aria-hidden="true" size={14} />
                        {reversing === log.id ? "Opozi..." : "Opozovi"}
                      </button>
                    ) : null}

                    {isTopUp ? (
                      <span className="shrink-0 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/70 px-5 py-3 text-[28px] font-extrabold leading-none tabular-nums text-blue-700 ring-1 ring-blue-600/10">
                        +{formatRsd(log.amountRsd ?? 0)}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </StaffCard>

      <StaffConfirmDialog
        open={pendingReversal !== null}
        title="Opoziv akcije"
        message={
          pendingReversal
            ? `Jeste li sigurni da želite da opozovete akciju „${actionLabels[pendingReversal.action]}” na kartici studenta “${
                cardById.get(pendingReversal.cardId)?.studentName ?? "Nepoznat student"
              }”? Ova radnja menja stanje kartice i dodaje novu stavku u istoriju.`
            : ""
        }
        confirmLabel="Opozovi"
        variant="warning"
        onCancel={() => setPendingReversal(null)}
        onConfirm={() => {
          if (!pendingReversal) return;
          setReversing(pendingReversal.id);
          void reverseReferentAction(
            pendingReversal.id,
            session?.displayName ?? "Administrator",
          )
            .catch((error) => {
              console.error("[OPOZIV] Greška:", error);
            })
            .finally(() => {
              setReversing(null);
              setPendingReversal(null);
            });
        }}
      />
    </div>
  );
}
