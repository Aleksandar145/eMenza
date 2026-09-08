"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, History, MessageSquareText, UserCheck, Wallet } from "lucide-react";
import { CardQrLookupPanel } from "@/components/referent/CardQrLookupPanel";
import { ReferentAdminNotices } from "@/components/referent/ReferentAdminNotices";
import { ReferentWelcomePanel } from "@/components/referent/ReferentWelcomePanel";
import { StaffCard, StaffStatCard } from "@/components/staff";
import { useEffect, useMemo, useState } from "react";
import { useReferentCards } from "@/hooks/useReferentCards";
import { getReferentReport } from "@/lib/referent-reports-mock";
import { resolveEffectiveCardStatus, type ReferentActionType } from "@/lib/referent-cards-mock";
import { fetchPendingRequestsFromApi } from "@/lib/profile-change-requests-store";

const actionIcons: Record<ReferentActionType, string> = {
  activate: "text-emerald-600",
  block: "text-red-600",
  unblock: "text-amber-600",
  top_up: "text-blue-600",
  extend: "text-[#5055D2]",
  refund: "text-orange-500",
  reversal: "text-slate-600",
};

const actionLabels: Record<ReferentActionType, string> = {
  activate: "Aktivacija",
  block: "Blokada",
  unblock: "Deblokada",
  top_up: "Dopuna",
  extend: "Produženje",
  refund: "Refundacija",
  reversal: "Opoziv",
};

export function ReferentDashboard() {
  const { state } = useReferentCards();
  const dailyReport = getReferentReport("day", undefined, state.actionLogs);
  const [pendingProfileRequests, setPendingProfileRequests] = useState(0);

  useEffect(() => {
    void fetchPendingRequestsFromApi().then((requests) => {
      setPendingProfileRequests(requests.length);
    });
  }, []);

  const stats = {
    pendingActivations: state.cards.filter(
      (card) => resolveEffectiveCardStatus(card) === "pending_verification",
    ).length,
    todayCashTopUpRsd: dailyReport.totalCashTopUpRsd,
    activeCards: state.cards.filter((card) => resolveEffectiveCardStatus(card) === "active").length,
    pendingProfileRequests,
  };

  return (
    <div className="space-y-5">
      <ReferentWelcomePanel
        activeCards={stats.activeCards}
        pendingActivations={stats.pendingActivations}
        todayCashTopUpRsd={stats.todayCashTopUpRsd}
      />

      <ReferentAdminNotices />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/referent/aktivacija">
          <StaffStatCard
            accent="warning"
            icon={UserCheck}
            label="Čeka aktivaciju"
            meta="Klikni za red"
            value={String(stats.pendingActivations)}
          />
        </Link>
        <Link href="/referent/istorija">
          <StaffStatCard
            icon={Wallet}
            label="Danas uplaćeno"
            meta="Gotovinske dopune"
            value={`${stats.todayCashTopUpRsd.toLocaleString("sr-RS")} RSD`}
          />
        </Link>
        <Link href="/referent/kartice?status=active">
          <StaffStatCard
            accent="success"
            icon={CreditCard}
            label="Aktivne kartice"
            meta="Ukupno u sistemu"
            value={String(stats.activeCards)}
          />
        </Link>
        <Link href="/referent/zahtevi">
          <StaffStatCard
            accent={stats.pendingProfileRequests > 0 ? "warning" : undefined}
            icon={MessageSquareText}
            label="Zahtevi za izmenu"
            meta={stats.pendingProfileRequests > 0 ? "Čeka odobrenje" : "Nema zahteva"}
            value={String(stats.pendingProfileRequests)}
          />
        </Link>
      </div>

      {state.actionLogs.length > 0 ? (
        <StaffCard title="Poslednje akcije" description="Najnovije aktivnosti na karticama.">
          <ul className="space-y-2">
            {[...state.actionLogs]
              .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
              .slice(0, 5)
              .map((log) => (
                <li className="flex items-center gap-3 rounded-xl border border-black/5 bg-[#EFF1F4]/40 px-4 py-3" key={log.id}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${actionIcons[log.action]}`}>
                    {actionLabels[log.action]}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-black/70 truncate">{log.detail}</span>
                  <time className="shrink-0 text-xs text-black/45">
                    {new Intl.DateTimeFormat("sr-RS", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(log.at))}
                  </time>
                </li>
              ))}
          </ul>
        </StaffCard>
      ) : null}

      <CardQrLookupPanel compact />

      <StaffCard
        description="Verifikujte nove kartice, ručno dopunite gotovinu i upravljajte važenjem."
        title="Brzi pristup"
      >
        <div className="flex flex-wrap gap-3">
          <Link className="staff-nav-item staff-nav-item--active inline-flex !min-h-0 px-4 py-2" href="/referent/aktivacija">
            Red aktivacija
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[#5055D2] hover:bg-[#5055D2]/5"
            href="/referent/kartice"
          >
            Pretraga kartica
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[#5055D2] hover:bg-[#5055D2]/5"
            href="/referent/istorija"
          >
            Istorija
          </Link>
        </div>
      </StaffCard>
    </div>
  );
}

export default ReferentDashboard;
