import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type StaffEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function StaffEmptyState({ title, description, action, icon }: StaffEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--bg-primary)]/40 px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-sm)]">
        {icon ?? <Inbox aria-hidden="true" className="text-[var(--text-secondary)]" size={24} />}
      </div>
      <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
