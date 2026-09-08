"use client";

import { useCallback, useMemo, useState } from "react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import {
  clearFeedbackReply,
  deleteFeedbackEntry,
  markFeedbackReviewed,
} from "@/lib/admin-system-store";
import {
  StaffCard,
  StaffConfirmDialog,
  StaffSegmentedControl,
  StaffStatCard,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  staffInputClass,
} from "@/components/staff";
import {
  CheckSquare,
  Square,
  Star,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Reply,
  X,
} from "lucide-react";

const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50";

export function AdminFeedbackPage() {
  const { state, refresh } = useAdminSystem({ scope: "full" });
  const [filter, setFilter] = useState<"all" | "unreviewed">("all");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<{ count: number; ids: string[] } | null>(null);
  const [deleteReplyTarget, setDeleteReplyTarget] = useState<string | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<{ id: string; title: string } | null>(null);

  const overview = useMemo(() => {
    const entries = state.feedbackEntries;
    const avg =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + e.rating, 0) / entries.length
        : 0;
    return { count: entries.length, avg };
  }, [state.feedbackEntries]);

  const items =
    filter === "unreviewed"
      ? state.feedbackEntries.filter((e) => !e.reviewed)
      : state.feedbackEntries;

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((e) => e.id)));
    }
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = useCallback(async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setBatchDeleteTarget({ count, ids: [...selectedIds] });
  }, [selectedIds]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StaffStatCard label="Prosečna ocena" value={overview.avg.toFixed(1)} icon={Star} />
        <StaffStatCard label="Ukupno utisaka" value={String(overview.count)} icon={Star} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StaffSegmentedControl
          options={[
            { id: "all", label: "Svi" },
            { id: "unreviewed", label: "Nepregledani" },
          ]}
          value={filter}
          onChange={(v) => setFilter(v)}
        />

        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                className={dangerButtonClass}
                disabled={selectedIds.size === 0}
                onClick={() => void handleBatchDelete()}
                type="button"
              >
                <Trash2 aria-hidden="true" size={13} />
                Obriši ({selectedIds.size})
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
                onClick={exitSelectionMode}
                type="button"
              >
                <X aria-hidden="true" size={14} />
                Otkaži
              </button>
            </>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
              onClick={enterSelectionMode}
              type="button"
            >
              <CheckSquare aria-hidden="true" size={14} />
              Selektuj
            </button>
          )}
        </div>
      </div>

      {selectionMode ? (
        <div className="flex items-center gap-2 border-b border-[var(--card-border)] pb-2">
          <button
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            onClick={toggleSelectAll}
            type="button"
          >
            {allSelected ? (
              <CheckSquare aria-hidden="true" className="text-[#5055D2]" size={18} />
            ) : (
              <Square aria-hidden="true" size={18} />
            )}
            Selektuj sve
          </button>
        </div>
      ) : null}

      <ul className="space-y-3">
        {items.map((entry) => (
          <StaffCard key={entry.id} padding="sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectionMode ? (
                  <button
                    className="shrink-0"
                    onClick={() => toggleSelect(entry.id)}
                    type="button"
                  >
                    {selectedIds.has(entry.id) ? (
                      <CheckSquare aria-hidden="true" className="text-[#5055D2]" size={20} />
                    ) : (
                      <Square aria-hidden="true" className="text-[var(--text-tertiary)]" size={20} />
                    )}
                  </button>
                ) : null}
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {entry.name} · {entry.rating}/5
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    <span>{entry.date}</span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp aria-hidden="true" size={11} />
                      {entry.helpfulCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown aria-hidden="true" size={11} />
                      {entry.disagreeCount}
                    </span>
                  </div>
                </div>
              </div>
              {entry.reviewed ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Pregledano
                </span>
              ) : (
                <button
                  className={staffButtonSecondaryClass}
                  onClick={() => setReplyingTo(replyingTo === entry.id ? null : entry.id)}
                  type="button"
                >
                  Odgovori
                </button>
              )}
            </div>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">{entry.message}</p>

            {entry.adminReply && (
              <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-[#5055D2]/5 px-3 py-2">
                <div className="min-w-0 flex-1 text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[#5055D2]">Admin: </span>
                  {entry.adminReply}
                </div>
                <button
                  className="shrink-0 text-xs font-semibold text-red-500 transition-colors hover:text-red-600"
                  onClick={() => setDeleteReplyTarget(entry.id)}
                  type="button"
                >
                  Obriši odgovor
                </button>
              </div>
            )}

            {replyingTo === entry.id && (
              <div className="mt-3 flex gap-2">
                <input
                  className={staffInputClass + " flex-1"}
                  onChange={(e) =>
                    setReplyText((prev) => ({ ...prev, [entry.id]: e.target.value }))
                  }
                  placeholder="Unesi odgovor..."
                  value={replyText[entry.id] ?? ""}
                />
                <button
                  className={staffButtonPrimaryClass}
                  onClick={() => {
                    void markFeedbackReviewed(entry.id, replyText[entry.id] || undefined).then(() => {
                      setReplyingTo(null);
                      refresh();
                    });
                  }}
                  type="button"
                >
                  <Reply aria-hidden="true" size={14} />
                  Pošalji
                </button>
              </div>
            )}

            <div className="mt-3 flex justify-end border-t border-[var(--card-border)] pt-3">
              <button
                className={dangerButtonClass}
                onClick={() => setDeleteEntryTarget({ id: entry.id, title: entry.message.slice(0, 50) })}
                type="button"
              >
                <Trash2 aria-hidden="true" size={13} />
                Obriši utisak
              </button>
            </div>
          </StaffCard>
        ))}
      </ul>

      <StaffConfirmDialog
        open={Boolean(batchDeleteTarget)}
        title="Obriši utiske"
        message={`Da li ste sigurni da želite da obrišete ${batchDeleteTarget?.count ?? 0} utisaka?`}
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={async () => {
          if (batchDeleteTarget) {
            for (const id of batchDeleteTarget.ids) {
              await deleteFeedbackEntry(id);
            }
            exitSelectionMode();
            refresh();
          }
          setBatchDeleteTarget(null);
        }}
        onCancel={() => setBatchDeleteTarget(null)}
      />

      <StaffConfirmDialog
        open={Boolean(deleteReplyTarget)}
        title="Obriši odgovor"
        message="Da li ste sigurni da želite da obrišete odgovor?"
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={async () => {
          if (deleteReplyTarget) {
            await clearFeedbackReply(deleteReplyTarget);
            refresh();
          }
          setDeleteReplyTarget(null);
        }}
        onCancel={() => setDeleteReplyTarget(null)}
      />

      <StaffConfirmDialog
        open={Boolean(deleteEntryTarget)}
        title="Obriši utisak"
        message={`Da li ste sigurni da želite da obrišete ovaj utisak?`}
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={async () => {
          if (deleteEntryTarget) {
            await deleteFeedbackEntry(deleteEntryTarget.id);
            refresh();
          }
          setDeleteEntryTarget(null);
        }}
        onCancel={() => setDeleteEntryTarget(null)}
      />
    </div>
  );
}

export default AdminFeedbackPage;
