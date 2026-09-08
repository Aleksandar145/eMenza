"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Megaphone, MessageSquareText, UtensilsCrossed } from "lucide-react";
import { StaffCard, StaffStatCard } from "@/components/staff";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { getAdminAnalyticsReport } from "@/lib/admin-analytics-mock";
import { getPendingDishes } from "@/lib/dish-catalog-store";
import { resolveEffectiveCardStatus } from "@/lib/referent-cards-mock";
import { loadReferentCardsState } from "@/lib/referent-cards-store";
import { getInitials } from "@/lib/admin-helpers";

export function AdminDashboard() {
  const { state } = useAdminSystem({ scope: "full" });
  const daily = getAdminAnalyticsReport("day");
  const pendingDishes = getPendingDishes().length;
  const activeCards = loadReferentCardsState().cards.filter(
    (card) => resolveEffectiveCardStatus(card) === "active",
  ).length;
  const activeNotices = state.publishedNotices.filter((notice) => !notice.archived).length;
  const recentNotices = state.publishedNotices.filter((n) => !n.archived).slice(0, 3);
  const recentFeedback = state.feedbackEntries.slice(0, 3);

  const kpis = [
    {
      label: "Obroci danas",
      value: String(daily.mealCount),
      icon: UtensilsCrossed,
      meta: "Preuzeti i zakazani",
      bars: [40, 65, 55, 80, 70],
    },
    {
      label: "Naplata obroka",
      value: `${daily.totalMealsPaidRsd.toLocaleString("sr-RS")} RSD`,
      icon: CreditCard,
      meta: "Današnji promet",
      bars: [50, 72, 68, 90, 85],
    },
    {
      label: "Prosečna ocena",
      value: daily.feedbackCount > 0 ? daily.avgFeedbackRating.toFixed(1) : "—",
      icon: MessageSquareText,
      meta: `${daily.feedbackCount} utisaka`,
      accent: "success" as const,
    },
    {
      label: "Aktivne kartice",
      value: String(activeCards),
      icon: CreditCard,
      meta: "Studentski nalozi",
    },
    {
      label: "Objavljena obaveštenja",
      value: String(activeNotices),
      icon: Megaphone,
      meta: "Vidljivo studentima",
    },
  ];

  const quickLinks = [
    { href: "/admin/obavestenja", label: "Objavi obaveštenje", desc: "Informiši studente" },
    { href: "/admin/katalog-jela", label: "Katalog jela", desc: "Upravljaj jelima i cenama" },
    { href: "/admin/monitoring", label: "Monitoring", desc: "Analitika i izveštaji" },
    { href: "/admin/podesavanja", label: "Podešavanja", desc: "Radno vreme i cene" },
  ];

  return (
    <div className="space-y-5">
      {pendingDishes > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <span className="font-bold">{pendingDishes}</span> jela čeka odobrenje u katalogu.
          </p>
          <Link
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:underline"
            href="/admin/katalog-jela"
          >
            Pregledaj
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <StaffStatCard
            accent={kpi.accent}
            bars={kpi.bars}
            icon={kpi.icon}
            key={kpi.label}
            label={kpi.label}
            meta={kpi.meta}
            value={kpi.value}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StaffCard title="Poslednja obaveštenja">
          <ul className="space-y-2">
            {recentNotices.map((notice) => (
              <li
                className="flex items-start gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)]/50 px-3 py-2.5"
                key={notice.id}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#5055D2]/10 text-xs font-bold text-[#5055D2]">
                  <Megaphone aria-hidden="true" size={16} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text-primary)]">{notice.title}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{notice.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </StaffCard>

        <StaffCard title="Poslednji utisci">
          <ul className="space-y-2">
            {recentFeedback.map((entry) => (
              <li
                className="flex items-start gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)]/50 px-3 py-2.5"
                key={entry.id}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-700">
                  {getInitials(entry.name)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {entry.name} · {entry.rating}/5
                  </p>
                  <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{entry.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </StaffCard>
      </div>

      <StaffCard description="Najčešće administrativne akcije" title="Brzi pristup">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              className="group flex items-center justify-between rounded-xl border border-[var(--card-border)] px-4 py-3 transition-colors hover:border-[#5055D2]/30 hover:bg-[#5055D2]/5"
              href={link.href}
              key={link.href}
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{link.label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{link.desc}</p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="text-[var(--text-secondary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[#5055D2]"
                size={16}
              />
            </Link>
          ))}
        </div>
      </StaffCard>
    </div>
  );
}

export default AdminDashboard;
