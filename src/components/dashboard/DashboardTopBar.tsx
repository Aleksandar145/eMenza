"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Bell, CircleHelp } from "lucide-react";
import { MealCountCards } from "@/components/dashboard/MealCountCards";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useStudentNotificationInbox } from "@/hooks/useStudentNotificationInbox";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useStudentSession } from "@/hooks/useStudentSession";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useT } from "@/i18n/useT";

type DashboardTopBarProps = {
  showMealCards?: boolean;
  className?: string;
};

function ProfileActionButton({
  href,
  label,
  children,
  badge,
}: {
  href: string;
  label: string;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <Link
      aria-label={label}
      className="relative flex size-10 items-center justify-center rounded-xl bg-white text-[#5055D2] shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#5055D2]/10 lg:size-11"
      href={href}
    >
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 flex min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardTopBar({
  showMealCards = true,
  className = "",
}: DashboardTopBarProps) {
  const profile = useStudentProfile();
  const { isLoggingOut } = useStudentSession();
  const { isLoaded: settingsLoaded } = useUserSettings();
  const { unreadCount } = useStudentNotificationInbox();
  const { t } = useT();
  const notificationLabel =
    unreadCount > 0
      ? t("nav.items.notificationsUnread", { count: unreadCount })
      : t("nav.items.notifications");
  const mounted = useClientMounted();
  const showProfileLoading = !mounted || isLoggingOut;
  const showSubtitleLoading = !mounted || isLoggingOut || !settingsLoaded;

  return (
    <div
      className={`flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-3 ${className}`}
    >
      <div
        className={`card-light min-w-0 flex-1 rounded-[20px] ${
          showMealCards
            ? "p-2.5 lg:min-h-[96px] lg:p-3"
            : "self-start px-2.5 py-1.5 lg:px-3 lg:py-2"
        }`}
      >
        <div className="flex h-full min-w-0 items-center gap-3 rounded-[18px] bg-[#EFF1F4] px-3 py-2.5 lg:gap-4 lg:px-4 lg:py-3">
          <Link
            className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80 lg:gap-3.5"
            href="/podesavanja"
          >
            <div className="relative size-11 shrink-0 overflow-hidden rounded-full lg:size-12">
              {showProfileLoading ? (
                <div className="size-full animate-pulse rounded-full bg-black/10" />
              ) : (
                <StudentAvatar
                  alt={profile.displayName}
                  fallbackSrc={profile.avatarFallbackUrl}
                  src={profile.avatarUrl}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-tight text-black lg:text-lg">
                {showProfileLoading ? (
                  <span className="inline-block h-5 w-36 animate-pulse rounded bg-black/10" />
                ) : (
                  profile.displayName
                )}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-black/55 lg:text-sm">
                {showSubtitleLoading ? (
                  <span className="inline-block h-3.5 w-28 animate-pulse rounded bg-black/10" />
                ) : (
                  profile.subtitle
                )}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 border-l border-black/10 pl-3 lg:gap-2.5 lg:pl-4">
            <ProfileActionButton
              badge={unreadCount}
              href="/obavestenja"
              label={notificationLabel}
            >
              <Bell aria-hidden="true" size={20} strokeWidth={2} />
            </ProfileActionButton>
            <ProfileActionButton href="/pomoc" label={t("nav.items.help")}>
              <CircleHelp aria-hidden="true" size={20} strokeWidth={2} />
            </ProfileActionButton>
          </div>
        </div>
      </div>

      {showMealCards ? <MealCountCards className="lg:min-h-[96px]" /> : null}
    </div>
  );
}

export default DashboardTopBar;
