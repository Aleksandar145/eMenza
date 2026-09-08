"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChefHat, FileText, HelpCircle, Paperclip, RefreshCw, Send, ShieldCheck, Sparkles, Trash2, Users, WifiOff, X } from "lucide-react";
import { useToast } from "@/components/shared/toast/useToast";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { deleteComplaintEntry, getComplaintEntries, submitComplaint } from "@/lib/admin-system-store";
import { COMPLAINT_CATEGORY_LABELS, type ComplaintCategory, type ComplaintEntry, type ComplaintStatus, type FileAttachment } from "@/lib/admin-system-mock";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const CATEGORIES: ComplaintCategory[] = ["hrana", "usluga", "higijena", "tehnicki_problem", "drugo"];

const CATEGORY_ICONS: Record<ComplaintCategory, typeof ChefHat> = {
  hrana: ChefHat,
  usluga: Users,
  higijena: Sparkles,
  tehnicki_problem: WifiOff,
  drugo: HelpCircle,
};

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; bg: string; text: string; dot: string }> = {
  novo: { label: "Novo", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  pregledano: { label: "Pregledano", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  reseno: { label: "Rešeno", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
};

const MY_COMPLAINTS_KEY = "emenza-my-complaint-ids";

function loadMyComplaintIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_COMPLAINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMyComplaintId(id: string) {
  try {
    const ids = loadMyComplaintIds();
    if (!ids.includes(id)) {
      ids.unshift(id);
      localStorage.setItem(MY_COMPLAINTS_KEY, JSON.stringify(ids));
    }
  } catch {}
}

function removeMyComplaintId(id: string) {
  try {
    const ids = loadMyComplaintIds().filter((i) => i !== id);
    localStorage.setItem(MY_COMPLAINTS_KEY, JSON.stringify(ids));
  } catch {}
}

export function ZalbeForm() {
  const toast = useToast();
  const profile = useStudentProfile();
  const cardBlocked = profile.cardStatus !== "active";
  const [category, setCategory] = useState<ComplaintCategory>("hrana");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allEntries, setAllEntries] = useState<ComplaintEntry[]>([]);
  const [fileAttachment, setFileAttachment] = useState<FileAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setFileAttachment(null); return; }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Fajl je prevelik. Maksimalna veličina je 2 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileAttachment({
        name: file.name,
        type: file.type,
        data: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  }

  function clearFile() {
    setFileAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const myEmail = profile.email || "";

  const myComplaints = useMemo(
    () => {
      const myIds = loadMyComplaintIds();
      return allEntries.filter(
        (e) =>
          myIds.includes(e.id) ||
          (myEmail && e.email.toLowerCase() === myEmail.toLowerCase()) ||
          (profile.userId && e.profileId === profile.userId),
      );
    },
    [allEntries, myEmail, profile.userId],
  );

  useEffect(() => {
    setAllEntries(getComplaintEntries());
  }, []);

  function refresh() {
    setAllEntries(getComplaintEntries());
  }

  async function handleSubmit() {
    if (!message.trim() || isSubmitting || cardBlocked) return;

    setIsSubmitting(true);
    try {
      const result = submitComplaint({
        name: profile.displayName || "Nepoznat korisnik",
        email: profile.email,
        category,
        message: message.trim(),
        profileId: profile.userId ?? undefined,
        fileAttachment: fileAttachment ?? undefined,
      });
      const newEntry = result.complaintEntries[0];
      if (newEntry) {
        saveMyComplaintId(newEntry.id);
      }
      setSubmitted(true);
      setMessage("");
      clearFile();
      refresh();
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch {
      toast.error("Slanje žalbe nije uspelo. Pokušajte ponovo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* Form */}
      <div className="shrink-0 lg:w-[400px] lg:sticky lg:top-5 lg:self-start">
        <div className="flex flex-col rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50">
              <AlertTriangle className="text-red-500" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F2937]">Podnesi žalbu</h3>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                Žalbe će biti pregledane od strane administracije.
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <ShieldCheck size={18} className="shrink-0" />
              Žalba je prosleđena administraciji. Odgovor ćete dobiti nakon pregleda.
            </div>
          ) : null}

          {cardBlocked ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              Kartica nije aktivna. Aktivirajte karticu kod referenta pre nego što podnesete žalbu.
            </div>
          ) : null}

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Kategorija
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      category === cat
                        ? "bg-[#5055D2] text-white shadow-sm"
                        : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#5055D2]/30 hover:text-[#5055D2]"
                    }`}
                  >
                    <Icon size={14} />
                    {COMPLAINT_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File attachment */}
          <div className="mt-4">
            <label className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Prilog (opciono)
            </label>
            {fileAttachment ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2.5">
                <FileText size={16} className="shrink-0 text-[#5055D2]" />
                <span className="flex-1 truncate text-sm text-[#1F2937]">{fileAttachment.name}</span>
                <button
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-red-500"
                  onClick={clearFile}
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#6B7280] transition-colors hover:border-[#5055D2]/30 hover:text-[#5055D2]"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Paperclip size={14} />
                Dodaj fajl (slika / PDF)
              </button>
            )}
            <input
              ref={fileInputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              type="file"
            />
          </div>

          <div className="mt-4 flex flex-col">
            <label
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"
              htmlFor="zalba-message"
            >
              Opis žalbe
            </label>
            <textarea
              className="min-h-[8rem] w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm text-[#1F2937] transition-colors placeholder:text-[#9CA3AF] focus:border-[#5055D2] focus:outline-none"
              disabled={isSubmitting}
              id="zalba-message"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Opišite problem..."
              value={message}
            />
          </div>

          <button
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5055D2] py-3 font-semibold text-white transition-all hover:bg-[#4348B8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !message.trim() || cardBlocked}
            onClick={() => void handleSubmit()}
            type="button"
          >
            <span>{isSubmitting ? "Slanje…" : "Pošalji žalbu"}</span>
            {isSubmitting ? null : (
              <Send aria-hidden="true" className="transition-transform group-hover:translate-x-1" size={16} />
            )}
          </button>
        </div>
      </div>

      {/* My complaints */}
      <div className="min-h-0 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1F2937] lg:text-lg">
            Moje žalbe
            {myComplaints.length > 0 && (
              <span className="ml-2 rounded-full bg-[#5055D2]/10 px-2 py-0.5 text-xs font-semibold text-[#5055D2]">
                {myComplaints.length}
              </span>
            )}
          </h3>
          {myComplaints.length > 0 && (
            <button
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-white hover:text-[#5055D2]"
              onClick={refresh}
              type="button"
            >
              <RefreshCw size={13} />
              Osveži
            </button>
          )}
        </div>

        {myComplaints.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF1F4]">
              <ShieldCheck className="text-[#6B7280]" size={24} />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#1F2937]">Još uvek nemate žalbi</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Sve poslate žalbe sa statusom odgovora pojaviće se ovde.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {myComplaints.map((entry) => (
              <ComplaintCard key={entry.id} entry={entry} onDelete={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComplaintCard({ entry, onDelete }: { entry: ComplaintEntry; onDelete: () => void }) {
  const cfg = STATUS_CONFIG[entry.status];
  const Icon = CATEGORY_ICONS[entry.category];
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteConfirm() {
    setConfirmDelete(false);
    deleteComplaintEntry(entry.id);
    removeMyComplaintId(entry.id);
    toast.success("Žalba je obrisana.");
    onDelete();
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF1F4]">
            <Icon className="text-[#6B7280]" size={16} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF1F4] px-2.5 py-0.5 text-xs font-medium text-[#6B7280]">
              {COMPLAINT_CATEGORY_LABELS[entry.category]}
            </span>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">{entry.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-red-500"
            onClick={() => setConfirmDelete(true)}
            title="Obriši žalbu"
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Message */}
      <p className="mt-3 text-sm leading-relaxed text-[#1F2937]">{entry.message}</p>

      {/* File attachment */}
      {entry.fileAttachment && (
        <AttachmentPreview attachment={entry.fileAttachment} />
      )}

      {/* Admin reply */}
      {entry.adminReply && (
        <div className="mt-3 rounded-2xl border border-[#5055D2]/10 bg-[#5055D2]/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5055D2]/10">
              <ShieldCheck size={12} className="text-[#5055D2]" />
            </div>
            <span className="text-xs font-semibold text-[#5055D2]">Odgovor administracije</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#374151]">{entry.adminReply}</p>
          {entry.adminRepliedAt && (
            <p className="mt-1 text-xs text-[#9CA3AF]">
              {new Date(entry.adminRepliedAt).toLocaleDateString("sr-RS", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}
      {confirmDelete && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
          <span className="flex-1 text-xs font-medium text-red-700">Da li ste sigurni da želite da obrišete žalbu?</span>
          <button className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700" onClick={handleDeleteConfirm} type="button">Da, obriši</button>
          <button className="rounded-lg border border-black/10 px-3 py-1 text-xs font-semibold text-black/60 hover:bg-black/5" onClick={() => setConfirmDelete(false)} type="button">Otkaži</button>
        </div>
      )}
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: FileAttachment }) {
  const isImage = attachment.type.startsWith("image/");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="mt-3 flex w-full items-center gap-2.5 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-left transition-colors hover:bg-[#F9FAFB]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5055D2]/10">
          {isImage ? (
            <img
              alt={attachment.name}
              className="h-6 w-6 rounded-lg object-cover"
              src={attachment.data}
            />
          ) : (
            <FileText size={16} className="text-[#5055D2]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#1F2937]">{attachment.name}</p>
          <p className="text-xs text-[#6B7280]">
            {isImage ? "Slika" : "PDF"} · Priložen fajl
          </p>
        </div>
        <FileText size={16} className="shrink-0 text-[#9CA3AF]" />
      </button>

      {open && isImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-colors hover:bg-red-50 hover:text-red-500"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
            <img
              alt={attachment.name}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              src={attachment.data}
            />
            <p className="mt-2 text-center text-sm font-medium text-white">{attachment.name}</p>
          </div>
        </div>
      )}

      {open && !isImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <FileText size={40} className="text-[#5055D2]" />
            <p className="text-center font-semibold text-[#1F2937]">{attachment.name}</p>
            <a
              className="rounded-xl bg-[#5055D2] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4348B8]"
              download={attachment.name}
              href={attachment.data}
            >
              Preuzmi fajl
            </a>
            <button
              className="text-xs font-medium text-[#6B7280] transition-colors hover:text-[#1F2937]"
              onClick={() => setOpen(false)}
              type="button"
            >
              Zatvori
            </button>
          </div>
        </div>
      )}
    </>
  );
}
