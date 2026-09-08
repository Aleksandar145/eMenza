"use client";

import { Clock, Key, UserCog, Ban, CheckCircle, Bell, Trash2 } from "lucide-react";
import type { StaffMember } from "@/lib/admin-system-mock";

type StaffActionsPopupProps = {
  member: StaffMember;
  position: { top?: number; bottom?: number; right: number };
  onClose: () => void;
  onLogs: () => void;
  onResetPassword: () => void;
  onChangeRole: () => void;
  onSuspendToggle: () => void;
  onSendNotice: () => void;
  onDelete: () => void;
};

export function StaffActionsPopup({
  member,
  position,
  onClose,
  onLogs,
  onResetPassword,
  onChangeRole,
  onSuspendToggle,
  onSendNotice,
  onDelete,
}: StaffActionsPopupProps) {
  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        className="fixed w-52 rounded-xl border border-black/[0.06] bg-white py-1 shadow-lg"
        style={{ ...(position.top !== undefined ? { top: position.top } : { bottom: position.bottom }), right: position.right }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-black/[0.03]"
          onClick={() => { onLogs(); onClose(); }}
          type="button"
        >
          <Clock size={15} className="text-[#5055D2]" />
          Logovi
        </button>
        <button
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-black/[0.03]"
          onClick={() => { onResetPassword(); onClose(); }}
          type="button"
        >
          <Key size={15} className="text-amber-600" />
          Resetuj lozinku
        </button>
        <button
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-black/[0.03]"
          onClick={() => { onChangeRole(); onClose(); }}
          type="button"
        >
          <UserCog size={15} className="text-blue-600" />
          Izmeni ulogu
        </button>
        {member.active ? (
          <button
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-black/[0.03]"
            onClick={() => { onSuspendToggle(); onClose(); }}
            type="button"
          >
            <Ban size={15} className="text-orange-600" />
            Suspenduj nalog
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-black/[0.03]"
            onClick={() => { onSuspendToggle(); onClose(); }}
            type="button"
          >
            <CheckCircle size={15} className="text-green-600" />
            Aktiviraj nalog
          </button>
        )}
        <button
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-black/[0.03]"
          onClick={() => { onSendNotice(); onClose(); }}
          type="button"
        >
          <Bell size={15} className="text-purple-600" />
          Interno obaveštenje
        </button>
        <div className="my-1 border-t border-black/[0.06]" />
        <button
          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          onClick={() => { onDelete(); onClose(); }}
          type="button"
        >
          <Trash2 size={15} />
          Obriši nalog
        </button>
      </div>
    </div>
  );
}
