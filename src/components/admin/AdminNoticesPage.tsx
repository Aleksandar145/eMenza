"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { AlertTriangle, CheckSquare, Eye, Info, Square, Trash2, X } from "lucide-react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useAdminSession } from "@/hooks/useAdminSession";
import { archiveNotice, publishNotice } from "@/lib/admin-system-store";
import type { NoticeTarget } from "@/lib/admin-system-mock";
import { getNoticeReadCountsViaApi, shouldUseAdminApi } from "@/lib/backend/admin-api";
import { useToast } from "@/components/shared/toast/useToast";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import {
  StaffCard,
  StaffConfirmDialog,
  StaffSegmentedControl,
  staffInputClass,
  staffButtonPrimaryClass,
} from "@/components/staff";

const TARGET_OPTIONS: { value: NoticeTarget; label: string }[] = [
  { value: "student", label: "STUDENTI" },
  { value: "referent", label: "REFERENT" },
  { value: "kitchen", label: "KUHINJA" },
];

const TARGET_LABELS: Record<NoticeTarget, string> = {
  student: "Studenti",
  referent: "Referenti",
  admin: "Admin",
  kitchen: "Kuhinja",
};

export function AdminNoticesPage() {
  const { state, refresh } = useAdminSystem({ scope: "full" });
  const { session } = useAdminSession();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"info" | "important">("info");
  const [displayMode, setDisplayMode] = useState<"standard" | "popup">("standard");
  const [targets, setTargets] = useState<NoticeTarget[]>(["student", "referent"]);
  const [publishing, setPublishing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [archiveTarget, setArchiveTarget] = useState<{ count: number; ids: string[] } | null>(null);
  const [archiveSingleTarget, setArchiveSingleTarget] = useState<{ id: string; title: string } | null>(null);

  function toggleTarget(value: NoticeTarget) {
    setTargets((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function selectAllTargets() {
    setTargets(TARGET_OPTIONS.map((o) => o.value));
  }

  const allTargetsSelected = targets.length === TARGET_OPTIONS.length;

  async function handlePublish() {
    if (!title.trim() || !message.replace(/<[^>]*>/g, "").trim() || targets.length === 0) return;
    setPublishing(true);
    try {
      await publishNotice({
        title,
        message,
        priority,
        targets,
        displayMode,
        authorName: session?.displayName,
        authorEmail: session?.email,
      });
      setTitle("");
      setMessage("");
      setTargets(["student", "referent"]);
      toast.success("Obaveštenje objavljeno");
    } catch {
      toast.error("Objavljivanje nije uspelo");
    } finally {
      setPublishing(false);
      refresh();
    }
  }

  const active = useMemo(() => state.publishedNotices.filter((n) => !n.archived), [state.publishedNotices]);

  const popupNotices = useMemo(() => active.filter((n) => n.displayMode === "popup"), [active]);

  const loadReadCounts = useCallback(async () => {
    if (!shouldUseAdminApi() || popupNotices.length === 0) return;
    const ids = popupNotices.map((n) => n.id);
    try {
      const counts = await getNoticeReadCountsViaApi(ids);
      setReadCounts(counts);
    } catch {
      // silently fail
    }
  }, [popupNotices]);

  useEffect(() => { void loadReadCounts(); }, [loadReadCounts]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allActiveSelected = active.length > 0 && selectedIds.size === active.length;

  function toggleSelectAll() {
    if (allActiveSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(active.map((n) => n.id)));
    }
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  const handleBatchArchive = useCallback(async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setArchiveTarget({ count, ids: [...selectedIds] });
  }, [selectedIds]);

  return (
    <div className="space-y-5">
      <StaffCard
        title="Objavi obaveštenje"
        description="Objavljivanje obaveštenja odabranim korisnicima"
      >
        <div className="space-y-4">
          <input
            className={`${staffInputClass} w-full`}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Naslov"
            value={title}
          />
          <RichTextEditor
            value={message}
            onChange={setMessage}
            placeholder="Poruka"
          />
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Prioritet:</span>
            <StaffSegmentedControl
              options={[
                { id: "info", label: "Informativno" },
                { id: "important", label: "Važno" },
              ]}
              value={priority}
              onChange={(v) => setPriority(v as "info" | "important")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Prikaz:</span>
            <StaffSegmentedControl
              options={[
                { id: "standard", label: "Standardno" },
                { id: "popup", label: "Pop-up" },
              ]}
              value={displayMode}
              onChange={(v) => setDisplayMode(v as "standard" | "popup")}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-[var(--text-secondary)]">Prosledi:</span>
            <div className="mt-2 inline-flex flex-wrap gap-1 rounded-xl border border-[var(--card-border)] bg-white p-1 shadow-[var(--shadow-sm)]">
              {TARGET_OPTIONS.map((opt) => {
                const selected = targets.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleTarget(opt.value)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      selected
                        ? "bg-[#5055D2] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={selectAllTargets}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  allTargetsSelected
                    ? "bg-[#5055D2] text-white shadow-sm"
                    : "text-[var(--text-tertiary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Sve
              </button>
            </div>
          </div>
          <button
            className={staffButtonPrimaryClass}
            disabled={publishing || !title.trim() || !message.replace(/<[^>]*>/g, "").trim()}
            onClick={handlePublish}
            type="button"
          >
            {publishing ? "Objavljivanje..." : "Objavi"}
          </button>
        </div>
      </StaffCard>

      <StaffCard
        title="Aktivna obaveštenja"
        actions={
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                  disabled={selectedIds.size === 0}
                  onClick={handleBatchArchive}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                  Arhiviraj ({selectedIds.size})
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
                  onClick={exitSelectionMode}
                  type="button"
                >
                  <X aria-hidden="true" size={14} />
                  Otkaži
                </button>
              </>
            ) : (
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
                onClick={enterSelectionMode}
                type="button"
              >
                <CheckSquare aria-hidden="true" size={14} />
                Selektuj
              </button>
            )}
          </div>
        }
      >
        {selectionMode ? (
          <div className="mb-3 flex items-center gap-2 border-b border-[var(--card-border)] pb-2">
            <button
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              onClick={toggleSelectAll}
              type="button"
            >
              {allActiveSelected ? (
                <CheckSquare aria-hidden="true" className="text-[#5055D2]" size={18} />
              ) : (
                <Square aria-hidden="true" size={18} />
              )}
              Selektuj sve
            </button>
          </div>
        ) : null}

        <ul className="mt-2 space-y-3">
          {active.map((notice) => (
            <li key={notice.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  {selectionMode ? (
                    <button
                      className="mt-0.5 shrink-0"
                      onClick={() => toggleSelect(notice.id)}
                      type="button"
                    >
                      {selectedIds.has(notice.id) ? (
                        <CheckSquare aria-hidden="true" className="text-[#5055D2]" size={20} />
                      ) : (
                        <Square aria-hidden="true" className="text-[var(--text-tertiary)]" size={20} />
                      )}
                    </button>
                  ) : null}
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{notice.title}</p>
                    {notice.authorName ? (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        Objavio: <span className="font-medium text-[var(--text-secondary)]">{notice.authorName}</span>
                        {notice.authorEmail ? <span className="ml-1">({notice.authorEmail})</span> : null}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-[var(--text-secondary)] [&_a]:text-[#5055D2] [&_a]:font-semibold [&_a]:underline" dangerouslySetInnerHTML={{ __html: notice.message }} />
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {notice.time} ·{" "}
                      {(Array.isArray(notice.target) ? notice.target : [notice.target])
                        .map((t) => TARGET_LABELS[t as NoticeTarget] ?? t)
                        .join(", ")}{" "}
                      ·{" "}
                      {notice.priority === "important" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <AlertTriangle aria-hidden="true" size={14} />
                          Važno
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                          <Info aria-hidden="true" size={14} />
                          Informativno
                        </span>
                      )}{" "}
                      ·{" "}
                      {notice.displayMode === "popup" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#5055D2]">
                          <Eye aria-hidden="true" size={14} />
                          Pop-up
                          <span className="font-normal text-[var(--text-muted)]">
                            ({readCounts[notice.id] ?? "?"} pregleda)
                          </span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Standardno</span>
                      )}
                    </p>
                  </div>
                </div>
                {!selectionMode ? (
                  <button
                    className="text-xs font-semibold text-red-600"
                    onClick={() => setArchiveSingleTarget({ id: notice.id, title: notice.title })}
                    type="button"
                  >
                    Arhiviraj
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </StaffCard>

      <StaffConfirmDialog
        open={Boolean(archiveTarget)}
        title="Arhiviraj obaveštenja"
        message={`Da li ste sigurni da želite da arhivirate ${archiveTarget?.count ?? 0} obaveštenja?`}
        confirmLabel="Arhiviraj"
        variant="warning"
        onConfirm={async () => {
          if (archiveTarget) {
            try {
              await archiveNotice(archiveTarget.ids);
              exitSelectionMode();
              refresh();
              toast.success(`Arhivirano ${archiveTarget.count} obaveštenja`);
            } catch {
              toast.error("Arhiviranje nije uspelo");
            }
          }
          setArchiveTarget(null);
        }}
        onCancel={() => setArchiveTarget(null)}
      />

      <StaffConfirmDialog
        open={Boolean(archiveSingleTarget)}
        title="Arhiviraj obaveštenje"
        message={`Da li ste sigurni da želite da arhvirirate obaveštenje "${archiveSingleTarget?.title ?? ""}"?`}
        confirmLabel="Arhiviraj"
        variant="warning"
        onConfirm={async () => {
          if (archiveSingleTarget) {
            try {
              await archiveNotice(archiveSingleTarget.id);
              refresh();
            } catch {
              toast.error("Arhiviranje nije uspelo");
            }
          }
          setArchiveSingleTarget(null);
        }}
        onCancel={() => setArchiveSingleTarget(null)}
      />
    </div>
  );
}

export default AdminNoticesPage;
