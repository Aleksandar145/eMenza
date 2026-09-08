"use client";

import Link from "next/link";
import { ArrowLeft, Ban, Check, MessageSquareText, Printer, ShieldOff } from "lucide-react";
import {
  StaffCard,
  StaffConfirmDialog,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  staffInputClass,
} from "@/components/staff";
import { useState } from "react";
import { CardStatusBadge } from "@/components/referent/CardStatusBadge";
import { ExtendValidityForm } from "@/components/referent/ExtendValidityForm";
import { ManualTopUpForm } from "@/components/referent/ManualTopUpForm";
import { NotesPopup } from "@/components/referent/NotesPopup";
import { ReferentActionHistory } from "@/components/referent/ReferentActionHistory";
import { useToast } from "@/components/shared/toast/useToast";
import { useReferentCards } from "@/hooks/useReferentCards";
import { useReferentSession } from "@/hooks/useReferentSession";
import {
  activateCard,
  addCardNote,
  blockCard,
  getActionLogsForCard,
  getCardById,
  getNoteEntriesForCard,
  unblockCard,
} from "@/lib/referent-cards-store";
import { formatCardValidUntilLabel, getActiveNotesCountForCard, resolveEffectiveCardStatus } from "@/lib/referent-cards-mock";

type StudentCardDetailPanelProps = {
  cardId: string;
};

export function StudentCardDetailPanel({ cardId }: StudentCardDetailPanelProps) {
  const { session } = useReferentSession();
  const { refresh } = useReferentCards();
  const toast = useToast();
  const card = getCardById(cardId);
  const [noteInput, setNoteInput] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  if (!card) {
    return (
      <StaffCard padding="md">
        <p className="font-semibold text-[var(--text-primary)]">Kartica nije pronađena</p>
        <Link className={staffButtonSecondaryClass + " mt-3 inline-block"} href="/referent/kartice">
          Nazad na pretragu
        </Link>
      </StaffCard>
    );
  }

  const effectiveStatus = resolveEffectiveCardStatus(card);
  const logs = getActionLogsForCard(cardId);
  const activeNotesCount = getActiveNotesCountForCard(card);

  async function handleActivate() {
    if (!session) return;
    try {
      await activateCard(cardId, session.displayName);
      refresh();
      setShowActivateDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aktivacija nije uspela.");
    }
  }

  async function handleBlock() {
    if (!session) return;
    try {
      await blockCard(cardId, session.displayName, blockReason.trim() || undefined);
      refresh();
      setShowBlockDialog(false);
      setBlockReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Blokiranje nije uspelo.");
    }
  }

  async function handleUnblock() {
    if (!session) return;
    try {
      await unblockCard(cardId, session.displayName);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reaktivacija nije uspela.");
    }
  }

  async function handleAddNote() {
    if (!noteInput.trim()) return;
    try {
      await addCardNote(cardId, noteInput.trim());
      setNoteInput("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Čuvanje napomene nije uspelo.");
    }
  }

  function handleRefresh() {
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            className={staffButtonSecondaryClass + " inline-flex items-center gap-2 text-sm font-semibold"}
            href="/referent/kartice"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Kartice
          </Link>
          <span className="text-lg font-bold text-[var(--text-primary)]">Kartica</span>
        </div>
        <ExtendValidityForm
          cardId={cardId}
          currentValidUntil={card.validUntil}
          onSuccess={refresh}
          compact
        />
      </div>

      <StaffCard
        title={card.studentName}
        description={card.email}
        actions={
          <div className="flex items-center gap-4">
            <CardStatusBadge status={effectiveStatus} />
            <p className="text-2xl font-extrabold tabular-nums text-[var(--brand-primary)]">
              {card.balanceRsd.toLocaleString("sr-RS")} RSD
            </p>
          </div>
        }
      >
        <dl className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Broj kartice</dt>
            <dd className="font-mono text-sm font-semibold text-[var(--text-primary)]">{card.cardNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Indeks</dt>
            <dd className="text-sm font-semibold text-[var(--text-primary)]">{card.indexNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Fakultet</dt>
            <dd className="text-sm text-[var(--text-secondary)]">{card.faculty}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Važi do</dt>
            <dd className="text-sm font-semibold text-[var(--text-primary)]">{formatCardValidUntilLabel(card.validUntil)}</dd>
          </div>
          {card.lastLogin ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Poslednja prijava</dt>
              <dd className="text-sm text-[var(--text-secondary)]">
                {new Intl.DateTimeFormat("sr-RS", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(card.lastLogin))}
              </dd>
            </div>
          ) : null}
          {card.loginCount != null && card.loginCount > 0 ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Broj prijava</dt>
              <dd className="text-sm font-semibold text-[var(--text-primary)]">{card.loginCount}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {effectiveStatus === "pending_verification" ? (
            <button className={staffButtonPrimaryClass} onClick={() => setShowActivateDialog(true)} type="button">
              <Check aria-hidden="true" size={16} />
              Aktiviraj
            </button>
          ) : null}
          {effectiveStatus === "blocked" ? (
            <button className={staffButtonPrimaryClass} onClick={handleUnblock} type="button">
              <ShieldOff aria-hidden="true" size={16} />
              Ukloni blokadu
            </button>
          ) : (
            <button className={staffButtonSecondaryClass + " border-red-200 bg-red-50 text-red-700"} onClick={() => setShowBlockDialog(true)} type="button">
              <Ban aria-hidden="true" size={16} />
              Blokiraj
            </button>
          )}
          <button className={staffButtonSecondaryClass} onClick={() => setShowReceipt(true)} type="button">
            <Printer aria-hidden="true" size={16} />
            Potvrda dopune
          </button>
        </div>
      </StaffCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ManualTopUpForm
          cardId={cardId}
          onSuccess={refresh}
        />
        <StaffCard title="Interne napomene" padding="md">
          <textarea
            className={`${staffInputClass} min-h-[96px]`}
            onChange={(event) => setNoteInput(event.target.value)}
            placeholder="Nova napomena..."
            value={noteInput}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={staffButtonPrimaryClass}
              disabled={!noteInput.trim()}
              onClick={() => void handleAddNote()}
              type="button"
            >
              Sačuvaj napomenu
            </button>
            <button
              className={staffButtonSecondaryClass}
              onClick={() => setShowNotesPopup(true)}
              type="button"
            >
              <MessageSquareText aria-hidden="true" size={16} />
              Vidi aktivne napomene ({activeNotesCount})
            </button>
          </div>
        </StaffCard>
      </div>

      <StaffCard title="Istorija akcija" padding="md">
        <ReferentActionHistory logs={logs} />
      </StaffCard>

      {showReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Zatvori" className="absolute inset-0 bg-black/40" onClick={() => setShowReceipt(false)} type="button" />
          <div className="relative z-10 w-full max-w-md">
            <StaffCard padding="lg">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Potvrda o dopuni</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{card.studentName} · {card.cardNumber}</p>
              <p className="mt-4 text-sm">Stanje na kartici: <strong>{card.balanceRsd.toLocaleString("sr-RS")} RSD</strong></p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Mock potvrda — za štampu koristite Ctrl+P u pregledaču.</p>
              <div className="mt-5 flex gap-2">
                <button className={staffButtonPrimaryClass + " flex-1"} onClick={() => window.print()} type="button">Štampaj</button>
                <button className={staffButtonSecondaryClass + " flex-1"} onClick={() => setShowReceipt(false)} type="button">Zatvori</button>
              </div>
            </StaffCard>
          </div>
        </div>
      ) : null}

      <NotesPopup
        cardId={cardId}
        notes={getNoteEntriesForCard(cardId)}
        open={showNotesPopup}
        onClose={() => setShowNotesPopup(false)}
        onRefresh={handleRefresh}
      />

      <StaffConfirmDialog
        open={showActivateDialog}
        title="Aktivirati karticu?"
        message={`Da li ste sigurni da želite da aktivirate karticu za ${card.studentName}?`}
        confirmLabel="Aktiviraj"
        variant="warning"
        onConfirm={handleActivate}
        onCancel={() => setShowActivateDialog(false)}
      />

      {showBlockDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowBlockDialog(false); setBlockReason(""); }} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <Ban className="text-red-600" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">Blokirati karticu?</p>
                <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                  Kartica za <span className="font-semibold">{card.studentName}</span> biće blokirana. Student neće moći da koristi karticu dok se blokada ne ukloni.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45">
                Razlog blokade (opciono)
              </label>
              <textarea
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/20 min-h-[80px] resize-y"
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Npr. Izgubljena kartica, zamolba studenta..."
                value={blockReason}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-black/5"
                onClick={() => { setShowBlockDialog(false); setBlockReason(""); }}
                type="button"
              >
                Otkaži
              </button>
              <button
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={handleBlock}
                type="button"
              >
                Blokiraj
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StudentCardDetailPanel;
