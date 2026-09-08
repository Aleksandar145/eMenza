"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  QrCode,
  Settings,
  Ticket,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { FastingOptInProvider } from "@/components/shared/FastingOptInProvider";
import { CardAccessBlockedModal } from "@/components/shared/CardAccessBlockedModal";
import { AppTimeControl } from "@/components/shared/AppTimeControl";
import { CounterQueueBadge } from "@/components/shared/CounterQueueBadge";
import { NoticePopup } from "@/components/shared/NoticePopup";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { useMealServiceInProgress } from "@/hooks/useMealServiceInProgress";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useStudentSession } from "@/hooks/useStudentSession";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useT } from "@/i18n/useT";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  isLogout?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type AppLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  activeItem?: string;
  searchPlaceholder?: string;
  fillViewport?: boolean;
};

function useMainNavGroups(): NavGroup[] {
  const { t } = useT();

  return [
    {
      title: t("nav.groups.meals"),
      items: [
        { label: t("nav.items.home"), href: "/", icon: LayoutDashboard },
        { label: t("nav.items.reservations"), href: "/rezervacije", icon: CalendarDays },
      ],
    },
    {
      title: t("nav.groups.counter"),
      items: [
        { label: t("nav.items.myToken"), href: "/moj-zeton", icon: Ticket },
        { label: t("nav.items.qrPickup"), href: "/preuzimanje", icon: QrCode },
      ],
    },
    {
      title: t("nav.groups.account"),
      items: [
        { label: t("nav.items.statistics"), href: "/statistika", icon: ChartNoAxesCombined },
        { label: t("nav.items.feedback"), href: "/knjiga-utisaka", icon: MessageSquareText },
        { label: t("nav.items.zalbe"), href: "/zalbe", icon: AlertTriangle },
      ],
    },
  ];
}

function useFooterNavItems(): NavItem[] {
  const { t } = useT();

  return [
    { label: t("nav.items.settings"), href: "/podesavanja", icon: Settings },
    { label: t("nav.items.logout"), href: "#", icon: LogOut, isLogout: true },
  ];
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

function SidebarProfileCard() {
  const { isAuthenticated } = useStudentSession();
  const profile = useStudentProfile();

  if (!isAuthenticated || !profile.isLoaded) return null;

  return (
    <Link
      href="/podesavanja"
      className="mb-2 flex items-center gap-2.5 rounded-2xl bg-white/60 px-3 py-2 transition-colors hover:bg-white/90"
    >
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
        <StudentAvatar
          alt={profile.displayName}
          fallbackSrc={profile.avatarFallbackUrl}
          src={profile.avatarUrl}
          sizes="40px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#1F2937]">
          {profile.displayName}
        </p>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-[#6B7280]">
          <Wallet size={12} className="shrink-0" />
          <span className="truncate font-medium">
            {profile.balanceFormatted} {profile.currency}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SidebarLogoutButton({ item }: { item: NavItem }) {
  const router = useRouter();
  const { logout } = useStudentSession();
  const Icon = item.icon;

  async function handleLogout() {
    await logout();
    router.replace("/login?logout=1");
  }

  return (
    <button
      className="flex min-h-[36px] w-full items-center gap-2.5 rounded-2xl px-3 py-1.5 text-[13px] font-light text-black transition-colors hover:bg-white/70"
      onClick={() => void handleLogout()}
      type="button"
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      <span className="leading-snug">{item.label}</span>
    </button>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useT();

  const items: NavItem[] = [
    { label: t("nav.items.home"), href: "/", icon: LayoutDashboard },
    { label: t("nav.items.reservations"), href: "/rezervacije", icon: CalendarDays },
    { label: t("nav.items.myToken"), href: "/moj-zeton", icon: Ticket },
    { label: t("nav.items.notifications"), href: "/obavestenja", icon: Bell },
    { label: t("nav.items.settings"), href: "/podesavanja", icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobilna navigacija"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[#EFF1F4]/95 backdrop-blur-md md:hidden print:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href);
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarQueueBadge({ isActive }: { isActive: boolean }) {
  const todayDateKey = useTodayDateKey();
  const { mealType } = useMealServiceInProgress();

  if (!mealType) {
    return null;
  }

  return (
    <CounterQueueBadge
      className={isActive ? "border-white/25 bg-white/15 text-white" : ""}
      dateKey={todayDateKey}
      mealType={mealType}
      variant="compact"
    />
  );
}

function SidebarNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const isActive = isActivePath(pathname, item.href);

  return (
    <Link
      className={`flex min-h-[36px] items-center gap-2.5 rounded-2xl px-3 py-1.5 text-[13px] transition-colors ${
        isActive
          ? "bg-[#5055D2] font-semibold text-white shadow-[0_2px_8px_rgba(80,85,210,0.25)]"
          : "font-light text-black hover:bg-white/70"
      }`}
      href={item.href}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={isActive ? 2.2 : 1.8} />
      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
      {item.href === "/preuzimanje" ? <SidebarQueueBadge isActive={isActive} /> : null}
    </Link>
  );
}

function SidebarNavGroup({
  group,
  pathname,
  isFirst,
}: {
  group: NavGroup;
  pathname: string;
  isFirst?: boolean;
}) {
  return (
    <div className={isFirst ? "" : "border-t border-black/[0.06] pt-1.5"}>
      <p className="mb-0.5 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/45">
        {group.title}
      </p>
      <div className="flex flex-col gap-1">
        {group.items.map((item) => (
          <SidebarNavLink item={item} key={item.href} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

export function AppLayout({ children, title, subtitle, fillViewport = false }: AppLayoutProps) {
  const pathname = usePathname();
  const { t } = useT();
  const mainNavGroups = useMainNavGroups();
  const footerNavItems = useFooterNavItems();

  return (
    <FastingOptInProvider>
    <div className="flex h-screen gap-4 overflow-hidden bg-[#D9D9D9] p-4 font-sans text-[#1F2937] lg:p-6">
      <aside className="sticky top-4 -mb-4 hidden h-[calc(100vh-1rem)] w-[280px] shrink-0 flex-col overflow-hidden rounded-t-3xl bg-[#EFF1F4] px-3 py-3 shadow-[0_4px_4px_rgba(0,0,0,0.25)] md:flex lg:top-6 lg:-mb-6 lg:h-[calc(100vh-1.5rem)] lg:w-[300px] lg:px-3 lg:py-4">
        <Link className="mb-2 block shrink-0 px-2 text-center" href="/">
          <span className="block text-2xl font-bold text-[#5055D2]">{t("nav.brandName")}</span>
          <span className="mt-0.5 block text-[10px] font-light uppercase tracking-[0.12em] text-black">
            {t("nav.brandTagline")}
          </span>
        </Link>

        <SidebarProfileCard />

        <AppTimeControl className="mb-2 shrink-0" />

        <nav className="flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden">
          {mainNavGroups.map((group, index) => (
            <SidebarNavGroup
              group={group}
              isFirst={index === 0}
              key={group.title}
              pathname={pathname}
            />
          ))}
        </nav>

        <div className="mt-auto flex shrink-0 flex-col gap-0.5 border-t border-black/[0.06] pt-2">
          {footerNavItems.map((item) =>
            item.isLogout ? (
              <SidebarLogoutButton item={item} key={item.href} />
            ) : (
              <SidebarNavLink item={item} key={item.href} pathname={pathname} />
            ),
          )}
        </div>
      </aside>

      <main
        className={`min-h-0 min-w-0 flex-1 overflow-x-visible pb-20 md:pb-0 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D1D5DB] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1 ${
          fillViewport
            ? "h-full overflow-hidden"
            : "custom-scrollbar overflow-y-auto"
        }`}
      >
        <div
          className={`mx-auto w-full max-w-[1400px] px-1 ${
            fillViewport ? "flex h-full min-h-0 flex-col" : "space-y-5 pb-2"
          }`}
        >
          <AppTimeControl className="shrink-0" variant="compact" />
          {title || subtitle ? (
            <div className="space-y-1">
              {title ? (
                <h1 className="text-2xl font-semibold tracking-tight text-[#1F2937]">{title}</h1>
              ) : null}
              {subtitle ? <p className="text-sm text-[#6B7280]">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>
      <MobileBottomNav />
      <CardAccessBlockedModal />
      <NoticePopup />
    </div>
    </FastingOptInProvider>
  );
}

export default AppLayout;
