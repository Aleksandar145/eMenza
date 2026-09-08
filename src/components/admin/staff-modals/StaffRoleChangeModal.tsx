"use client";

import { useState } from "react";
import { Shield, X } from "lucide-react";
import { staffInputClass, staffLabelClass } from "@/components/staff";
import { EMPLOYEE_ROLE_LABELS, type EmployeeRole, type StaffMember } from "@/lib/admin-system-mock";

type StaffRoleChangeModalProps = {
  target: {
    member: StaffMember;
  };
  onConfirm: (newRole: EmployeeRole) => void;
  onCancel: () => void;
};

export function StaffRoleChangeModal({
  target,
  onConfirm,
  onCancel,
}: StaffRoleChangeModalProps) {
  const [newRole, setNewRole] = useState<EmployeeRole>(target.member.role);

  const roleOptions = (Object.entries(EMPLOYEE_ROLE_LABELS) as [EmployeeRole, string][]).map(
    ([id, label]) => ({ id, label }),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
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
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Izmeni ulogu
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {target.member.name}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--text-primary)]">
          Trenutna uloga:{" "}
          <span className="font-semibold">{EMPLOYEE_ROLE_LABELS[target.member.role]}</span>
        </p>
        <div className="mt-3">
          <label className={staffLabelClass}>Nova uloga</label>
          <select
            className={staffInputClass}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as EmployeeRole)}
          >
            {roleOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
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
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            onClick={() => onConfirm(newRole)}
            type="button"
          >
            Sačuvaj
          </button>
        </div>
      </div>
    </div>
  );
}
