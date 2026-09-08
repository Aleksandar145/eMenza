"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import { StaffBadge } from "@/components/staff/StaffBadge";
import { StaffPageHeader } from "@/components/staff/StaffPageHeader";
import { AppTimeControl } from "@/components/shared/AppTimeControl";
import {
  isNavItemActive,
  panelLabels,
  type AdminNavGroup,
  type StaffNavBadgeKey,
  type StaffNavItem,
  type StaffPanel,
} from "@/components/staff/staff-nav";
import { formatCalendarDayLabel, calendarTodayDateKey } from "@/lib/dashboard-mock";

export type StaffSession = {
  displayName: string;
  email: string;
};

export type StaffNavBadges = Partial<Record<StaffNavBadgeKey, number>>;

type StaffShellProps = {
  panel: StaffPanel;
  navItems: StaffNavItem[];
  navGroups?: AdminNavGroup[];
  session: StaffSession;
  onLogout: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  panelIcon: LucideIcon;
  badges?: StaffNavBadges;
  topBarExtra?: ReactNode;
};

function resolveBadge(item: StaffNavItem, badges: StaffNavBadges) {
  if (!item.badgeKey) return null;
  const count = badges[item.badgeKey];
  if (item.badgeKey === "menuDraft") {
    return count && count > 0 ? <StaffBadge dot pulse /> : null;
  }
  if (!count || count <= 0) return null;
  const variant = (item.badgeKey === "pendingActivations" || item.badgeKey === "pendingProfileRequests") ? "warning" : "accent";
  return <StaffBadge count={count} pulse variant={variant} />;
}

export function StaffShell({
  panel,
  navItems,
  navGroups,
  session,
  onLogout,
  children,
  title,
  subtitle,
  panelIcon: PanelIcon,
  badges = {},
  topBarExtra,
}: StaffShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNav = navItems.filter((item) => item.mobilePrimary);
  const todayLabel = formatCalendarDayLabel(calendarTodayDateKey);

  const COLLAPSED_KEY = "emenza-nav-collapsed";
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  }, []);

  function renderNavLink(item: StaffNavItem, onNavigate?: () => void) {
    const Icon = item.icon;
    const isActive = isNavItemActive(pathname, item.href);
    const badge = resolveBadge(item, badges);

    return (
      <Link
        className={`staff-nav-item ${isActive ? "staff-nav-item--active" : ""}`}
        href={item.href}
        key={item.href}
        onClick={onNavigate}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon aria-hidden="true" className="shrink-0" size={20} />
          <span className="truncate">{item.label}</span>
        </span>
        {badge}
      </Link>
    );
  }

  const sidebar = (
    <>
      <div className="staff-sidebar-brand">
        <span className="block text-2xl font-bold text-[#5055D2]">eMenza</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {panelLabels[panel]}
        </span>
      </div>

      <AppTimeControl className="mb-4 shrink-0" />

      <nav aria-label="Glavna navigacija" className="staff-sidebar-nav">
        {navGroups
          ? navGroups.map((group, i) => {
              const isCollapsed = collapsed.has(group.id);
              return (
                <div key={group.id}>
                  <button
                    className={`flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)] ${
                      i === 0 ? "" : "mt-1"
                    }`}
                    onClick={() => toggleGroup(group.id)}
                    type="button"
                  >
                    {group.label}
                    <ChevronDown
                      className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                      size={14}
                    />
                  </button>
                  <div
                    className={`flex flex-col gap-0.5 overflow-hidden transition-all ${
                      isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                    }`}
                  >
                    {group.items.map((item) => renderNavLink(item))}
                  </div>
                </div>
              );
            })
          : navItems.map((item) => renderNavLink(item))}
      </nav>

      <div className="staff-sidebar-footer">
        <button className="staff-nav-item w-full" onClick={onLogout} type="button">
          <span className="flex items-center gap-3">
            <LogOut aria-hidden="true" size={20} />
            Odjavi se
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div className="staff-page print:bg-white">
      <aside className="staff-sidebar hidden md:flex">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Zatvori meni"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside className="staff-sidebar absolute inset-y-0 left-0 flex w-[min(100%,280px)] shadow-xl">
            <button
              aria-label="Zatvori"
              className="absolute right-3 top-3 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-black/5"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="staff-main">
        <header className="staff-topbar">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              aria-label="Otvori meni"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--card-border)] bg-white md:hidden"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 text-xs text-[var(--text-secondary)] sm:flex">
              <CalendarDays aria-hidden="true" size={14} />
              <span>Danas: {todayLabel}</span>
            </div>
            <AppTimeControl variant="topbar" />
          </div>
          <div className="relative flex shrink-0 items-center gap-3">
            {topBarExtra}
            <span
              aria-hidden="true"
              className="hidden h-6 w-px shrink-0 bg-[var(--card-border)] lg:block"
            />
            <div className="hidden items-center gap-2.5 rounded-xl border border-[var(--card-border)] bg-white px-3 py-1.5 shadow-[var(--shadow-sm)] lg:flex">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#5055D2]/10">
                <User aria-hidden="true" className="text-[#5055D2]" size={14} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-tight text-[var(--text-primary)]">{session.displayName}</p>
                <p className="truncate text-[10px] leading-tight text-[var(--text-secondary)]">{session.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="staff-content custom-scrollbar">
          <StaffPageHeader subtitle={subtitle} title={title} />
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobilna navigacija"
        className="staff-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--card-border)] bg-white/95 backdrop-blur-md md:hidden print:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href);
            const badge = resolveBadge(item, badges);
            return (
              <Link
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold ${
                  isActive ? "text-[#5055D2]" : "text-[var(--text-secondary)]"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" size={18} />
                <span className="truncate">{item.label.split(" ")[0]}</span>
                {badge ? <span className="absolute right-2 top-0">{badge}</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
