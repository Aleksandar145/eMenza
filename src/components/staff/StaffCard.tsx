import type { ReactNode } from "react";

type StaffCardProps = {
  children?: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
};

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function StaffCard({
  children,
  className = "",
  padding = "md",
  title,
  description,
  actions,
}: StaffCardProps) {
  return (
    <section className={`staff-card ${paddingMap[padding]} ${className}`.trim()}>
      {title || description || actions ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
