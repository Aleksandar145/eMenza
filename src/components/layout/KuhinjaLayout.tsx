"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ChefHat, LogOut } from "lucide-react";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { StaffBadge, isNavItemActive } from "@/components/staff";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { useKuhinjaJelovnik } from "@/hooks/useKuhinjaJelovnik";
import { StaffPanelLoadingShell } from "@/components/staff/StaffPanelLoadingShell";
import { AppTimeControl } from "@/components/shared/AppTimeControl";
import { countMenuAlerts } from "@/lib/kuhinja-menu-overview";
import { countKitchenNotices } from "@/lib/admin-system-store";
import {
  canAccessKitchenRoute,
  filterKitchenNavGroups,
  getVisibleKitchenNavItems,
  kitchenRoleLabels,
  normalizeKitchenStaffRole,
} from "@/lib/kuhinja-roles";

type KuhinjaLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function KuhinjaLayout({ children, title, subtitle }: KuhinjaLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, isReady, isAuthenticated } = useKuhinjaSessionContext();
  useKuhinjaJelovnik();
  useDishCatalog();
  useAdminSystem();
  const menuAlertCount = countMenuAlerts();
  const kitchenNoticeCount = countKitchenNotices();
  const staffRole = normalizeKitchenStaffRole(session?.role);
  const visibleNavGroups = filterKitchenNavGroups(staffRole);
  const mobileNavItems = getVisibleKitchenNavItems(staffRole).filter((item) => item.mobilePrimary);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/kuhinja/login");
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !session) {
      return;
    }

    if (pathname.startsWith("/kuhinja/login")) {
      return;
    }

    if (!canAccessKitchenRoute(staffRole, pathname)) {
      router.replace("/kuhinja");
    }
  }, [isReady, isAuthenticated, pathname, router, session, staffRole]);

  if (!isReady) {
    return <StaffPanelLoadingShell panelLabel="Kuhinja panel" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D9D9D9] text-sm text-black/55">
        Preusmeravanje na prijavu...
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.replace("/kuhinja/login");
  }

  return (
    <div className="flex h-screen gap-4 overflow-hidden bg-[#D9D9D9] p-4 font-sans text-[#1F2937] lg:p-6">
      <aside className="sticky top-4 hidden h-[calc(100vh-1rem)] w-[280px] shrink-0 flex-col overflow-hidden rounded-t-3xl bg-[#EFF1F4] px-4 py-5 shadow-[0_4px_4px_rgba(0,0,0,0.25)] md:flex lg:top-6 lg:h-[calc(100vh-1.5rem)] lg:w-[300px] lg:px-5 lg:py-6 print:hidden">
        <div className="mb-4 shrink-0 px-2 text-center">
          <span className="block text-2xl font-bold text-[#5055D2]">eMenza</span>
          <span className="mt-0.5 block text-[10px] font-light uppercase tracking-[0.12em] text-black">
            Kuhinja panel
          </span>
        </div>

        <AppTimeControl className="mb-4 shrink-0" />

        <nav className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {visibleNavGroups.map((group, groupIndex) => (
            <div key={group.id}>
              <p
                className={`px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40 ${
                  groupIndex === 0 ? "pt-0" : "pt-2"
                }`}
              >
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavItemActive(pathname, item.href);

                  return (
                    <Link
                      className={`flex min-h-[40px] items-center gap-2.5 rounded-2xl px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-[#5055D2] font-semibold text-white shadow-[0_2px_8px_rgba(80,85,210,0.25)]"
                          : "font-light text-black hover:bg-white/70"
                      }`}
                      href={item.href}
                      key={item.href}
                    >
                      <Icon aria-hidden="true" size={18} />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="leading-tight">{item.label}</span>
                        {item.showAlertBadge && menuAlertCount > 0 ? (
                          <StaffBadge count={menuAlertCount} pulse variant={isActive ? "neutral" : "warning"} />
                        ) : null}
                        {item.showNoticeBadge && kitchenNoticeCount > 0 ? (
                          <StaffBadge
                            count={kitchenNoticeCount}
                            variant={isActive ? "neutral" : "warning"}
                          />
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-black/[0.06] pt-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/70 px-2.5 py-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#5055D2]/10">
              <ChefHat aria-hidden="true" className="text-[#5055D2]" size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-black">{session?.displayName}</p>
              <p className="truncate text-xs text-black/55">{session?.email}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-[#5055D2]">
                {kitchenRoleLabels[staffRole]}
              </p>
            </div>
          </div>
          <button
            className="flex w-full min-h-[40px] items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-light text-black transition-colors hover:bg-white/70"
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" size={18} />
            Odjavi se
          </button>
        </div>
      </aside>

      <main className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto pb-20 print:overflow-visible md:pb-2">
        <div className="mx-auto w-full max-w-5xl space-y-5 px-1 pb-2 print:max-w-none">
          <AppTimeControl className="shrink-0 md:hidden" variant="compact" />
          {title || subtitle ? (
            <div className="space-y-1 print:hidden">
              {title ? (
                <h1 className="text-2xl font-semibold tracking-tight text-[#1F2937]">{title}</h1>
              ) : null}
              {subtitle ? <p className="text-sm text-[#6B7280]">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <nav
        aria-label="Mobilna navigacija"
        className="staff-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#EFF1F4]/95 backdrop-blur-md md:hidden print:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href);

            return (
              <Link
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold ${
                  isActive ? "text-[#5055D2]" : "text-black/55"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" size={18} />
                <span className="truncate">{item.label.split(" ")[0]}</span>
                {item.showAlertBadge && menuAlertCount > 0 ? (
                  <span className="absolute right-1 top-0">
                    <StaffBadge count={menuAlertCount} variant="warning" />
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default KuhinjaLayout;
