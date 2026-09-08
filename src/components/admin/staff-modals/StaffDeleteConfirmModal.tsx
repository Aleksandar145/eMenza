"use client";

import { StaffConfirmDialog } from "@/components/staff";

type StaffDeleteConfirmModalProps = {
  target: {
    id: string;
    name: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
};

export function StaffDeleteConfirmModal({
  target,
  onConfirm,
  onCancel,
}: StaffDeleteConfirmModalProps) {
  return (
    <StaffConfirmDialog
      open
      title="Obriši nalog"
      message={`Da li ste sigurni da želite da obrišete nalog ${target.name}? Ova akcija je nepovratna. Nalog će biti trajno uklonjen.`}
      confirmLabel="Obriši"
      cancelLabel="Otkaži"
      variant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
