"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  Ban,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  GraduationCap,
  Play,
  Search,
  Ticket,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useReferentCards } from "@/hooks/useReferentCards";
import { ADMIN_MOCK_CREDENTIALS } from "@/lib/admin-system-mock";
import { activateCard, blockCard, unblockCard } from "@/lib/referent-cards-store";
import { resolveEffectiveCardStatus, cardStatusLabels } from "@/lib/referent-cards-mock";
import type { StudentCard, CardStatus } from "@/lib/referent-cards-mock";
import { getReligionLabel, type UserReligion } from "@/lib/user-preferences";
import {
  StaffCard,
  StaffTable,
  StaffTableHead,
  StaffTableBody,
  staffInputClass,
  staffButtonPrimaryClass,
} from "@/components/staff";

const statusClassName: Record<CardStatus, string> = {
  pending_verification: "bg-amber-500/12 text-amber-700",
  active: "bg-[#2f8f55]/12 text-[#2f8f55]",
  blocked: "bg-red-500/12 text-red-700",
  expired: "bg-black/8 text-black/55",
};

function formatDate(iso: string | undefined): string {
  if (!iso) return "/";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "/";
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "/";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "/";
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const filterBtnClass = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? "bg-[#5055D2] text-white"
      : "bg-black/[0.04] text-[var(--text-secondary)] hover:bg-black/[0.08]"
  }`;

const detailRowClass = "flex items-center justify-between gap-4 py-2";
const detailLabelClass = "text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide";
const detailValueClass = "text-sm font-semibold text-right";

export function AdminStudentsPage() {
  const { state, refresh } = useReferentCards();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"sve" | "ucenik" | "student">("sve");
  const [statusFilter, setStatusFilter] = useState<CardStatus | "all">("all");
  const [detailCard, setDetailCard] = useState<StudentCard | null>(null);
  const [blockFormCard, setBlockFormCard] = useState<StudentCard | null>(null);
  const [suspending, setSuspending] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.cards.filter((card) => {
      if (typeFilter !== "sve" && card.role !== typeFilter) return false;
      if (statusFilter !== "all" && resolveEffectiveCardStatus(card) !== statusFilter) return false;
      if (!q) return true;
      return (
        card.studentName.toLowerCase().includes(q) ||
        card.email.toLowerCase().includes(q) ||
        card.cardNumber.includes(q) ||
        card.indexNumber.toLowerCase().includes(q)
      );
    });
  }, [state.cards, query, typeFilter, statusFilter]);

  const studentCount = useMemo(
    () => state.cards.filter((c) => c.role === "student").length,
    [state.cards],
  );

  const ucenikCount = useMemo(
    () => state.cards.filter((c) => c.role === "ucenik").length,
    [state.cards],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      active: 0,
      blocked: 0,
      expired: 0,
      pending_verification: 0,
    };
    for (const card of state.cards) {
      const status = resolveEffectiveCardStatus(card);
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [state.cards]);

  async function handleStatusAction(cardId: string, action: "activate" | "unblock" | "expire") {
    setSuspending(true);
    try {
      const logName = ADMIN_MOCK_CREDENTIALS.displayName;
      if (action === "activate" || action === "unblock") {
        await unblockCard(cardId, logName);
      }
      refresh();
    } catch {
      // silently fail
    } finally {
      setSuspending(false);
      setDetailCard(null);
    }
  }

  async function handleBlockSubmit(cardId: string, reason: string, blockedUntil?: string) {
    setSuspending(true);
    try {
      const logName = ADMIN_MOCK_CREDENTIALS.displayName;
      await blockCard(cardId, logName, reason, blockedUntil);
      refresh();
    } catch {
      // silently fail
    } finally {
      setSuspending(false);
      setBlockFormCard(null);
      setDetailCard(null);
    }
  }

  function toggleTypeFilter(value: "ucenik" | "student") {
    setTypeFilter((prev) => (prev === value ? "sve" : value));
  }

  function toggleStatusFilter(value: CardStatus) {
    setStatusFilter((prev) => (prev === value ? "all" : value));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Pregled svih registrovanih korisnika i njihovih kartica.
        </p>
        <Link
          href="/admin/monitoring"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-colors hover:border-[#5055D2]/30 hover:text-[#5055D2]"
        >
          Statistika studenata
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StaffCard title="Korisnici">
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-black/[0.02] p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-black/[0.04] text-[var(--text-secondary)]">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xl font-bold">{state.cards.length}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Ukupno</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#5055D2]/5 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#5055D2]/10 text-[#5055D2]">
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-xl font-bold">{studentCount}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Studenata</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xl font-bold">{ucenikCount}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Učenika</p>
              </div>
            </div>
          </div>
        </StaffCard>
        <StaffCard title="Kartice">
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-black/[0.02] p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-black/[0.04] text-[var(--text-secondary)]">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xl font-bold">{state.cards.length}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Ukupno</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#2f8f55]/10 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#2f8f55]/12 text-[#2f8f55]">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xl font-bold">{statusCounts.active}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Aktivnih</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-black/[0.02] p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-black/[0.04] text-[var(--text-secondary)]">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-xl font-bold">{statusCounts.pending_verification + statusCounts.blocked + statusCounts.expired}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Neaktivnih</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            Čeka aktivaciju: <span className="font-semibold">{statusCounts.pending_verification}</span>{" "}
            · Blokiranih: <span className="font-semibold">{statusCounts.blocked}</span>{" "}
            · Isteklih: <span className="font-semibold">{statusCounts.expired}</span>
          </p>
        </StaffCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            className={`${staffInputClass} pl-9`}
            placeholder="Pretraži po imenu, emailu, broju kartice ili indeksu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["sve", "student", "ucenik"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={filterBtnClass(typeFilter === f)}
              type="button"
            >
              {f === "sve" ? "Svi" : f === "student" ? "Studenti" : "Učenici"}
            </button>
          ))}
        </div>
        <span className="text-black/20 select-none">|</span>
        <div className="flex gap-2">
          {(["all", "active", "pending_verification", "blocked", "expired"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={filterBtnClass(statusFilter === s)}
              type="button"
            >
              {s === "all" ? "Svi statusi" : cardStatusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-6 overflow-x-auto border-y border-black/10">
        <div className="min-w-max px-6 py-1">
          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            {filtered.length} prikazanih · {state.cards.length} ukupno
          </span>
        </div>
        <StaffTable>
          <StaffTableHead>
            <tr>
              <th className="px-4 py-3 text-left">Ime i prezime</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Broj kartice</th>
              <th
                className="cursor-pointer px-4 py-3 text-left transition-colors hover:text-[#5055D2]"
                onClick={() => setStatusFilter(statusFilter === "all" ? "active" : "all")}
                title="Klikni za filtriranje po statusu"
              >
                <span className="inline-flex items-center gap-1">
                  Status
                  {statusFilter !== "all" && <ArrowDownWideNarrow size={12} />}
                </span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left transition-colors hover:text-[#5055D2]"
                onClick={() => setTypeFilter(typeFilter === "sve" ? "student" : "sve")}
                title="Klikni za filtriranje po tipu"
              >
                <span className="inline-flex items-center gap-1">
                  Tip
                  {typeFilter !== "sve" && <ArrowDownWideNarrow size={12} />}
                </span>
              </th>
              <th className="px-4 py-3 text-left">Verska pripadnost</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </StaffTableHead>
          <StaffTableBody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-sm text-[var(--text-tertiary)]" colSpan={7}>
                  Nema rezultata.
                </td>
              </tr>
            ) : (
              filtered.map((card) => {
                const effectiveStatus = resolveEffectiveCardStatus(card);
                const isDeactivated = effectiveStatus === "blocked";
                const isNotActive = effectiveStatus !== "active";
                const mutedClass = isNotActive ? "text-red-600/70" : "";
                return (
                  <tr
                    className={`border-t staff-table-row ${isDeactivated ? "bg-red-50/60" : ""}`}
                    key={card.id}
                  >
                    <td className={`whitespace-nowrap px-4 py-3 font-medium ${isNotActive ? "text-red-600" : ""}`}>{card.studentName}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-sm ${mutedClass}`}>{card.email}</td>
                    <td className={`whitespace-nowrap px-4 py-3 font-mono text-xs ${mutedClass}`}>{card.cardNumber}</td>
                    <td
                      className="cursor-pointer whitespace-nowrap px-4 py-3"
                      onClick={() => toggleStatusFilter(effectiveStatus)}
                    >
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClassName[effectiveStatus]}`}
                      >
                        {cardStatusLabels[effectiveStatus]}
                      </span>
                    </td>
                    <td
                      className="cursor-pointer whitespace-nowrap px-4 py-3"
                      onClick={() => toggleTypeFilter(card.role)}
                    >
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          card.role === "student"
                            ? "bg-[#5055D2]/10 text-[#5055D2]"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {card.role === "student" ? "Student" : "Učenik"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {card.religion ? getReligionLabel(card.religion as UserReligion) : "/"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-black/[0.02] hover:text-[#5055D2]"
                        onClick={() => setDetailCard(card)}
                        type="button"
                      >
                        <Eye size={14} />
                        Više
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </StaffTableBody>
        </StaffTable>
      </div>

      {detailCard && (
        <DetailModal
          card={detailCard}
          effectiveStatus={resolveEffectiveCardStatus(detailCard)}
          suspending={suspending}
          onClose={() => setDetailCard(null)}
          onAction={handleStatusAction}
          onBlock={(c) => { setDetailCard(null); setBlockFormCard(c); }}
        />
      )}
      {blockFormCard && (
        <BlockFormModal
          card={blockFormCard}
          processing={suspending}
          onClose={() => setBlockFormCard(null)}
          onSubmit={(reason, blockedUntil) => handleBlockSubmit(blockFormCard.id, reason, blockedUntil)}
        />
      )}
    </div>
  );
}

type DetailModalProps = {
  card: StudentCard;
  effectiveStatus: CardStatus;
  suspending: boolean;
  onClose: () => void;
  onAction: (cardId: string, action: "activate" | "unblock" | "expire") => void;
  onBlock: (card: StudentCard) => void;
};

function DetailModal({
  card,
  effectiveStatus,
  suspending,
  onClose,
  onAction,
  onBlock,
}: DetailModalProps) {
  const isDeactivated = effectiveStatus === "blocked";
  const hasZeton = card.ezetonStatus === "active" || card.ezetonStatus === "used";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <div
            className={`flex size-12 items-center justify-center rounded-xl ${
              isDeactivated ? "bg-red-100 text-red-600" : "bg-[#5055D2]/10 text-[#5055D2]"
            }`}
          >
            {isDeactivated ? <Ban size={24} /> : <GraduationCap size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{card.studentName}</h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClassName[effectiveStatus]}`}
            >
              {cardStatusLabels[effectiveStatus]}
            </span>
          </div>
        </div>

        <div className="mt-4 divide-y divide-black/[0.04]">
          <div className={detailRowClass}>
            <span className={detailLabelClass}>Email</span>
            <span className={detailValueClass}>{card.email}</span>
          </div>
          <div className={detailRowClass}>
            <span className={detailLabelClass}>Broj kartice</span>
            <span className={`${detailValueClass} font-mono`}>{card.cardNumber}</span>
          </div>
          <div className={detailRowClass}>
            <span className={detailLabelClass}>Verska pripadnost</span>
            <span className={detailValueClass}>
              {card.religion ? getReligionLabel(card.religion as UserReligion) : "Nije navedeno"}
            </span>
          </div>
          <div className={detailRowClass}>
            <span className={detailLabelClass}>Tip</span>
            <span className={detailValueClass}>{card.role === "student" ? "Student" : "Učenik"}</span>
          </div>
          <div className={detailRowClass}>
            <span className={detailLabelClass}>Datum registracije</span>
            <span className={detailValueClass}>{formatDate(card.registeredAt)}</span>
          </div>
          <div className={detailRowClass}>
            <span className={detailLabelClass}>Poslednji login</span>
            <span className={detailValueClass}>{formatDateTime(card.lastLogin)}</span>
          </div>
          <div className={detailRowClass}>
            <span className={detailLabelClass}>Ukupno puta loginovano</span>
            <span className={detailValueClass}>{card.loginCount ?? 0}</span>
          </div>
          <div className={detailRowClass}>
            <span className={detailLabelClass}>eZeton</span>
            <span className={detailValueClass}>
              {hasZeton ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#2f8f55]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2f8f55]">
                  <Ticket size={12} />Ima
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Nema
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-4">
          {effectiveStatus === "pending_verification" && (
            <button
              className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              onClick={() => onAction(card.id, "activate")}
              disabled={suspending}
              type="button"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Play size={16} />
                AKTIVIRAJ
              </span>
            </button>
          )}
          {effectiveStatus === "active" && (
            <button
              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              onClick={() => onBlock(card)}
              disabled={suspending}
              type="button"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Ban size={16} />
                BLOKIRAJ KARTICU
              </span>
            </button>
          )}
          {effectiveStatus === "blocked" && (
            <button
              className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              onClick={() => onAction(card.id, "unblock")}
              disabled={suspending}
              type="button"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Play size={16} />
                AKTIVIRAJ NALOG
              </span>
            </button>
          )}
          {effectiveStatus === "expired" && (
            <p className="w-full text-center text-xs text-[var(--text-tertiary)]">
              Kartica je istekla — može se produžiti na šalteru.
            </p>
          )}
        </div>
        {isDeactivated && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3">
            <Ban size={16} className="shrink-0 text-red-600" />
            <p className="text-xs font-medium text-red-700">
              Nalog je deaktiviran. Korisnik ne može koristiti karticu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type BlockFormModalProps = {
  card: StudentCard;
  processing: boolean;
  onClose: () => void;
  onSubmit: (reason: string, blockedUntil?: string) => void;
};

function BlockFormModal({ card, processing, onClose, onSubmit }: BlockFormModalProps) {
  const [reason, setReason] = useState("");
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [blockDate, setBlockDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    const blockedUntil = isUnlimited ? undefined : blockDate ? new Date(blockDate).toISOString() : undefined;
    onSubmit(reason.trim(), blockedUntil);
  }

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <Ban size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Blokiraj nalog</h3>
            <p className="text-sm text-[var(--text-secondary)]">{card.studentName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Razlog blokade <span className="text-red-500">*</span>
            </label>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#5055D2] resize-none"
              rows={3}
              placeholder="Unesite razlog blokade..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Vremenski period
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  checked={isUnlimited}
                  onChange={() => setIsUnlimited(true)}
                  className="size-4 accent-[#5055D2]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">Neograničeno</span>
              </label>
              <span className="text-black/20">|</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  checked={!isUnlimited}
                  onChange={() => setIsUnlimited(false)}
                  className="size-4 accent-[#5055D2]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">Do datuma</span>
              </label>
            </div>
            {!isUnlimited && (
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#5055D2]"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                min={minDate}
                required={!isUnlimited}
              />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-black/[0.02]"
              onClick={onClose}
              type="button"
            >
              OTKAŽI
            </button>
            <button
              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              type="submit"
              disabled={!reason.trim() || processing}
            >
              {processing ? "BLOKIRANJE..." : "BLOKIRAJ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
