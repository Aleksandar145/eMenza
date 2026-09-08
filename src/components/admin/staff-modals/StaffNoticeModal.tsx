"use client";

import { useRef, useState } from "react";
import { Bell, Bold, Italic, X } from "lucide-react";
import { StaffSegmentedControl, staffInputClass, staffLabelClass } from "@/components/staff";
import type { StaffMember } from "@/lib/admin-system-mock";

type StaffNoticeModalProps = {
  target: {
    member: StaffMember;
  };
  onSend: (data: {
    title: string;
    message: string;
    priority: "info" | "important";
    displayMode: "standard" | "popup";
  }) => void;
  onCancel: () => void;
};

export function StaffNoticeModal({
  target,
  onSend,
  onCancel,
}: StaffNoticeModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"info" | "important">("important");
  const [displayMode, setDisplayMode] = useState<"standard" | "popup">("popup");
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    onSend({
      title: title.trim(),
      message: message.trim(),
      priority,
      displayMode,
    });
  };

  const insertFormatting = (tag: "b" | "i") => {
    const ta = messageRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = message.substring(start, end);
    const before = message.substring(0, start);
    const after = message.substring(end);
    setMessage(`${before}<${tag}>${selected}</${tag}>${after}`);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={onCancel}
          type="button"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Pošalji obaveštenje
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {target.member.name}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs leading-relaxed text-purple-800">
            <span className="font-semibold">🔒 Interno obaveštenje</span>
            <br />
            Ovo obaveštenje će videti isključivo{" "}
            <span className="font-semibold">{target.member.name}</span> ({target.member.email}) kada se prijavi na svoj nalog.
          </div>
          <div>
            <label className={staffLabelClass}>Naslov</label>
            <input
              className={staffInputClass}
              placeholder="Npr. Podsetnik"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={staffLabelClass}>Poruka</label>
            <div className="flex items-center gap-1 rounded-t-xl border border-b-0 border-[var(--card-border)] bg-[#F8F9FB] px-3 py-1.5">
              <button
                className="flex size-7 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-white hover:text-[#1F2937]"
                onClick={() => insertFormatting("b")}
                title="Podebljano"
                type="button"
              >
                <Bold aria-hidden="true" size={15} />
              </button>
              <button
                className="flex size-7 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-white hover:text-[#1F2937]"
                onClick={() => insertFormatting("i")}
                title="Kurziv"
                type="button"
              >
                <Italic aria-hidden="true" size={15} />
              </button>
            </div>
            <textarea
              ref={messageRef}
              className={`${staffInputClass} min-h-[100px] resize-y rounded-t-none`}
              placeholder="Unesite poruku..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
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
        </div>
        <div className="mt-5 flex gap-3">
          <button
            className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-black/[0.02]"
            onClick={onCancel}
            type="button"
          >
            Otkaži
          </button>
          <button
            className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            disabled={!title.trim() || !message.trim()}
            onClick={handleSend}
            type="button"
          >
            Pošalji
          </button>
        </div>
      </div>
    </div>
  );
}
