"use client";

import { Archive, Edit2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { staffButtonPrimaryClass, staffButtonSecondaryClass } from "@/components/staff";
import { useToast } from "@/components/shared/toast/useToast";
import {
  archiveCardNote,
  updateSingleNote,
} from "@/lib/referent-cards-store";
import type { NoteEntry } from "@/lib/referent-cards-mock";

type NotesPopupProps = {
  cardId: string;
  notes: NoteEntry[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
};

export function NotesPopup({ cardId, notes, open, onClose, onRefresh }: NotesPopupProps) {
  const toast = useToast();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  if (!open) return null;

  async function handleArchive(noteId: string) {
    try {
      await archiveCardNote(cardId, noteId);
      toast.success("Napomena arhivirana.");
      onRefresh();
    } catch {
      toast.error("Arhiviranje nije uspelo.");
    }
  }

  function startEdit(note: NoteEntry) {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setEditContent("");
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>, noteId: string) {
    event.preventDefault();
    if (!editContent.trim()) return;
    try {
      await updateSingleNote(cardId, noteId, editContent.trim());
      toast.success("Napomena izmenjena.");
      setEditingNoteId(null);
      setEditContent("");
      onRefresh();
    } catch {
      toast.error("Izmena nije uspela.");
    }
  }

  const activeNotes = notes.filter((n) => !n.archived);

  return (
    <div
      aria-labelledby="notes-popup-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
    >
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]" id="notes-popup-title">
            Aktivne napomene ({activeNotes.length})
          </h2>
          <button
            aria-label="Zatvori"
            className="rounded-xl p-1.5 text-black/45 transition-colors hover:bg-black/5 hover:text-black/70"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {activeNotes.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Nema aktivnih napomena.</p>
          ) : (
            activeNotes.map((note) => (
              <div
                className="rounded-2xl border border-black/8 bg-[#EFF1F4]/50 p-4"
                key={note.id}
              >
                {editingNoteId === note.id ? (
                  <form onSubmit={(event) => void handleEditSubmit(event, note.id)}>
                    <textarea
                      className="min-h-[72px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setEditContent(event.target.value)}
                      value={editContent}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        className={staffButtonPrimaryClass + " text-xs"}
                        type="submit"
                      >
                        Sačuvaj
                      </button>
                      <button
                        className={staffButtonSecondaryClass + " text-xs"}
                        onClick={cancelEdit}
                        type="button"
                      >
                        Otkaži
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-sm text-[var(--text-secondary)]">{note.content}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-black/55 transition-colors hover:bg-black/5"
                        onClick={() => startEdit(note)}
                        type="button"
                      >
                        <Edit2 aria-hidden="true" size={12} />
                        Izmeni
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                        onClick={() => void handleArchive(note.id)}
                        type="button"
                      >
                        <Archive aria-hidden="true" size={12} />
                        Arhiviraj
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-black/8 px-5 py-4">
          <button
            className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold text-black/70 transition-colors hover:bg-[#EFF1F4]"
            onClick={onClose}
            type="button"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotesPopup;
