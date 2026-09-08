import type { ReactNode } from "react";
import { StaffEmptyState } from "@/components/staff/StaffEmptyState";

type StaffTableProps = {
  children: ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
};

export function StaffTable({
  children,
  empty = false,
  emptyTitle = "Nema podataka",
  emptyDescription,
  emptyAction,
  className = "",
}: StaffTableProps) {
  if (empty) {
    return (
      <StaffEmptyState
        action={emptyAction}
        description={emptyDescription}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className={`staff-table-wrap overflow-hidden ${className}`.trim()}>
      <table className="staff-table min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function StaffTableHead({ children }: { children: ReactNode }) {
  return <thead className="staff-table-head">{children}</thead>;
}

export function StaffTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}
