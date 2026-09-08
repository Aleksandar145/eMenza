"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, UserCheck, Wallet } from "lucide-react";
import { StaffCard } from "@/components/staff";
import { useReferentSession } from "@/hooks/useReferentSession";
import { calendarTodayDateKey, getTimeGreeting } from "@/lib/dashboard-mock";
import { formatCalendarDateLabel, parseDateKey } from "@/lib/calendar-utils";

const weekdayNamesLong = [
  "nedelja",
  "ponedeljak",
  "utorak",
  "sreda",
  "četvrtak",
  "petak",
  "subota",
] as const;

function formatTodayWelcomeDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  if (!date) return formatCalendarDateLabel(dateKey);
  const jsDate = new Date(date.year, date.month - 1, date.day);
  return `${weekdayNamesLong[jsDate.getDay()]}, ${formatCalendarDateLabel(dateKey)}`;
}

type ReferentWelcomePanelProps = {
  pendingActivations: number;
  todayCashTopUpRsd: number;
  activeCards: number;
};

export function ReferentWelcomePanel({
  pendingActivations,
  todayCashTopUpRsd,
  activeCards,
}: ReferentWelcomePanelProps) {
  const { session } = useReferentSession();
  const firstName = session?.displayName.split(/\s+/)[0] ?? "Referent";
  const greeting = getTimeGreeting();
  const todayLabel = formatTodayWelcomeDate(calendarTodayDateKey);

  const highlights = [
    {
      label: "Čeka aktivaciju",
      value: String(pendingActivations),
      href: "/referent/aktivacija",
      icon: UserCheck,
      accent: pendingActivations > 0 ? "text-amber-700 bg-amber-500/10" : "",
    },
    {
      label: "Danas uplaćeno",
      value: `${todayCashTopUpRsd.toLocaleString("sr-RS")} RSD`,
      href: "/referent/istorija",
      icon: Wallet,
      accent: "text-[#5055D2] bg-[#5055D2]/10",
    },
    {
      label: "Aktivne kartice",
      value: String(activeCards),
      href: "/referent/kartice?status=active",
      icon: CreditCard,
      accent: "text-emerald-700 bg-emerald-500/10",
    },
  ];

  return (
    <StaffCard padding="none">
      <div className="bg-gradient-to-br from-[#5055D2]/8 via-white to-[#9093E1]/10 px-5 py-5 sm:px-6">
        <p className="text-sm font-medium text-[#5055D2]">
          {greeting}, <span className="font-bold text-[var(--text-primary)]">{firstName}</span>
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <CalendarDays aria-hidden="true" className="shrink-0 text-[#5055D2]" size={16} />
          <span>
            Danas je <span className="font-semibold text-[var(--text-primary)]">{todayLabel}</span>
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--card-border)] px-5 py-4 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Važno danas
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)]/40 px-4 py-3 transition-colors hover:border-[#5055D2]/25 hover:bg-[#5055D2]/5"
                href={item.href}
                key={item.href}
              >
                <div className="min-w-0">
                  <p className={`text-lg font-extrabold tabular-nums ${item.accent.split(" ")[0]}`}>
                    {item.value}
                  </p>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                  <Icon aria-hidden="true" size={18} />
                </span>
              </Link>
            );
          })}
        </div>

        {pendingActivations > 0 ? (
          <Link
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            href="/referent/aktivacija"
          >
            {pendingActivations} kartica čeka verifikaciju
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        ) : null}
      </div>
    </StaffCard>
  );
}

export default ReferentWelcomePanel;
