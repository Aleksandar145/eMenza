"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { CardStatusBadge } from "@/components/referent/CardStatusBadge";
import { useReferentCards } from "@/hooks/useReferentCards";
import { useReferentSession } from "@/hooks/useReferentSession";
import { activateCard } from "@/lib/referent-cards-store";
import { resolveEffectiveCardStatus } from "@/lib/referent-cards-mock";
import { useToast } from "@/components/shared/toast/useToast";
import {
  StaffCard,
  StaffConfirmDialog,
  StaffEmptyState,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
} from "@/components/staff";

export function ActivationQueue() {
  const { session } = useReferentSession();
  const { state, refresh } = useReferentCards();
  const toast = useToast();
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchActivating, setBatchActivating] = useState(false);

  const pending = state.cards.filter(
    (card) => resolveEffectiveCardStatus(card) === "pending_verification",
  );

  const allSelected = pending.length > 0 && pending.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = useCallback((cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map((c) => c.id)));
    }
  }, [allSelected, pending]);

  async function handleActivate(cardId: string) {
    if (!session || activatingId) return;
    setError(null);
    setActivatingId(cardId);
    try {
      await activateCard(cardId, session.displayName);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktivacija nije uspela.");
    } finally {
      setActivatingId(null);
    }
  }

  async function handleBatchActivate() {
    if (!session || batchActivating) return;
    setBatchActivating(true);
    setError(null);
    let activatedCount = 0;
    try {
      for (const cardId of selectedIds) {
        await activateCard(cardId, session.displayName);
        activatedCount++;
      }
      toast.success(`${activatedCount} kartica aktivirano.`);
      setSelectedIds(new Set());
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Aktivirano ${activatedCount} od ${selectedIds.size} kartica.`);
    } finally {
      setBatchActivating(false);
      setShowBatchDialog(false);
    }
  }

  if (pending.length === 0) {
    return (
      <StaffEmptyState
        title="Nema kartica na čekanju"
        description="Sve postojeće kartice su već aktivirane. Nova registracija studenta na /register automatski stavlja karticu ovde na čekanje."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-white px-4 py-3">
        <input
          checked={allSelected}
          className="size-4 rounded border-black/20 text-[#5055D2] focus:ring-[#5055D2]/30"
          onChange={toggleSelectAll}
          type="checkbox"
        />
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {someSelected ? `Označeno: ${selectedIds.size} / ${pending.length}` : `Označi sve (${pending.length})`}
        </span>
      </div>

      <ul className="space-y-3">
        {pending.map((card) => (
          <li key={card.id}>
            <StaffCard padding="sm" className="!p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex items-start gap-3">
                  <input
                    checked={selectedIds.has(card.id)}
                    className="mt-1 size-4 rounded border-black/20 text-[#5055D2] focus:ring-[#5055D2]/30"
                    onChange={() => toggleSelect(card.id)}
                    type="checkbox"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">{card.studentName}</h3>
                      <CardStatusBadge status={resolveEffectiveCardStatus(card)} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{card.email}</p>
                    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Broj kartice</dt>
                        <dd className="font-mono font-semibold text-[var(--text-primary)]">{card.cardNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Indeks</dt>
                        <dd className="font-semibold text-[var(--text-primary)]">{card.indexNumber}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Fakultet</dt>
                        <dd className="text-[var(--text-secondary)]">{card.faculty}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <button
                    className={staffButtonPrimaryClass}
                    disabled={activatingId === card.id}
                    onClick={() => handleActivate(card.id)}
                    type="button"
                  >
                    <Check aria-hidden="true" size={16} />
                    {activatingId === card.id ? "Aktiviranje..." : "Aktiviraj karticu"}
                  </button>
                  <Link
                    className={staffButtonSecondaryClass}
                    href={`/referent/kartice/${encodeURIComponent(card.id)}`}
                  >
                    Detalji
                    <ExternalLink aria-hidden="true" size={14} />
                  </Link>
                </div>
              </div>
            </StaffCard>
          </li>
        ))}
      </ul>

      {someSelected ? (
        <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-xl border border-[#5055D2]/20 bg-[#5055D2]/5 px-4 py-3 shadow-lg">
          <span className="text-sm font-semibold text-[#5055D2]">
            Označeno: {selectedIds.size} kartica
          </span>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#5055D2] px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(80,85,210,0.3)] transition-all hover:bg-[#3e42b3] active:scale-[0.97]"
            disabled={batchActivating}
            onClick={() => setShowBatchDialog(true)}
            type="button"
          >
            <Check size={16} />
            {batchActivating ? "Aktiviranje..." : "Aktiviraj označene"}
          </button>
        </div>
      ) : null}

      <StaffConfirmDialog
        open={showBatchDialog}
        title={`Aktivirati ${selectedIds.size} kartica?`}
        message={`Svih ${selectedIds.size} označenih kartica biće aktivirano. Studenti će dobiti obaveštenje o aktivaciji.`}
        confirmLabel={batchActivating ? "Aktiviranje..." : "Aktiviraj sve"}
        variant="warning"
        onConfirm={handleBatchActivate}
        onCancel={() => setShowBatchDialog(false)}
      />
    </div>
  );
}

export default ActivationQueue;
