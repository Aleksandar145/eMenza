import type { ReactNode } from "react";

type StaffFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function StaffFormSection({ title, description, children, className = "" }: StaffFormSectionProps) {
  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export const staffInputClass =
  "w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15";

export const staffLabelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]";

export const staffButtonPrimaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#5055D2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60";

export const staffButtonSecondaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]";
