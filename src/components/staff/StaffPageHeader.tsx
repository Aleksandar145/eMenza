import type { ReactNode } from "react";

type StaffPageHeaderProps = {
  title?: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
};

export function StaffPageHeader({ title, subtitle, breadcrumbs, actions }: StaffPageHeaderProps) {
  if (!title && !subtitle && !actions) return null;

  return (
    <header className="staff-page-header">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            {breadcrumbs.map((crumb, index) => (
              <span className="inline-flex items-center gap-1.5" key={crumb.label}>
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                <span className={index === breadcrumbs.length - 1 ? "font-semibold text-[var(--text-primary)]" : ""}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        ) : null}
        {title ? (
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] lg:text-[1.65rem]">
            {title}
          </h1>
        ) : null}
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
