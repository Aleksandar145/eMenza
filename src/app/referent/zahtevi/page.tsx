"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock, RefreshCw, X } from "lucide-react";
import { ReferentLayout } from "@/components/layout/ReferentLayout";
import { StaffCard, StaffEmptyState, staffButtonPrimaryClass, staffButtonSecondaryClass } from "@/components/staff";
import { ProfileDataEditor } from "@/components/referent/ProfileDataEditor";
import { useReferentCards } from "@/hooks/useReferentCards";
import { fetchPendingRequestsFromApi, resolveProfileChangeRequest, type ProfileChangeRequest } from "@/lib/profile-change-requests-store";
import { useReferentSession } from "@/hooks/useReferentSession";
import { useToast } from "@/components/shared/toast/useToast";

export default function ReferentZahteviPage() {
  const { session } = useReferentSession();
  const { state, refresh } = useReferentCards();
  const toast = useToast();
  const [pendingRequests, setPendingRequests] = useState<ProfileChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadRequests() {
    setIsLoading(true);
    const requests = await fetchPendingRequestsFromApi();
    setPendingRequests(requests);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  function handleQuickResolve(requestId: string) {
    if (!session) return;
    resolveProfileChangeRequest(requestId, session.displayName);
    setPendingRequests((current) => current.filter((r) => r.id !== requestId));
    toast.success("Zahtev je rešen.");
    refresh();
  }

  return (
    <ReferentLayout subtitle="Pregled zahteva studenata za izmenu ličnih podataka." title="Zahtevi za izmenu">
      <div className="mb-4 flex items-center justify-end">
        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/60 transition-colors hover:bg-black/5"
          onClick={() => void loadRequests()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={14} />
          Osveži
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-[var(--text-muted)]">
          Učitavanje zahteva...
        </div>
      ) : pendingRequests.length === 0 ? (
        <StaffEmptyState
          description="Trenutno nema pending zahteva."
          icon={<Clock aria-hidden size={18} className="text-[var(--text-muted)]" />}
          title="Nema zahteva"
        />
      ) : (
        <div className="space-y-6">
          {pendingRequests.map((req) => {
            const matchingCard = state.cards.find(
              (c) => c.cardNumber.replace(/\D/g, "") === req.cardNumber.replace(/\D/g, ""),
            ) ?? null;
            const isExpanded = expandedId === req.id;

            return (
              <div key={req.id}>
                <StaffCard
                  padding="md"
                  title={req.studentName}
                  actions={
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                      onClick={() => handleQuickResolve(req.id)}
                      type="button"
                    >
                      <Check aria-hidden="true" size={12} />
                      Reši
                    </button>
                  }
                >
                  <p className="mb-2 text-xs text-[var(--text-muted)]">
                    Poslat: {new Date(req.createdAt).toLocaleDateString("sr-RS")}
                  </p>
                  <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-black/45">Email</span>
                      <p className="text-[var(--text-primary)]">{req.email}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-black/45">Broj kartice</span>
                      <p className="font-mono text-[var(--text-primary)]">{req.cardNumber}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {matchingCard ? (
                      <Link
                        className={`${staffButtonSecondaryClass} inline-flex items-center gap-2 text-xs font-semibold`}
                        href={`/referent/kartice/${matchingCard.id}`}
                      >
                        Idi na karticu
                        <ArrowRight aria-hidden="true" size={14} />
                      </Link>
                    ) : null}
                    <button
                      className={staffButtonPrimaryClass + " inline-flex items-center gap-2 text-xs"}
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      type="button"
                    >
                      {isExpanded ? <X aria-hidden="true" size={14} /> : null}
                      Izmeni podatke
                    </button>
                  </div>
                </StaffCard>

                {isExpanded && matchingCard ? (
                  <div className="ml-4 mt-2">
                    <ProfileDataEditor
                      card={matchingCard}
                      request={req}
                      onSuccess={() => { setExpandedId(null); void loadRequests(); refresh(); }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </ReferentLayout>
  );
}
