"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CreditCard } from "lucide-react";
import { StaffShell, referentNavItems } from "@/components/staff";
import { StaffPanelLoadingShell } from "@/components/staff/StaffPanelLoadingShell";
import { useReferentCards } from "@/hooks/useReferentCards";
import { useReferentSession } from "@/hooks/useReferentSession";
import { getReferentDashboardStats } from "@/lib/referent-cards-store";
import { fetchPendingRequestsFromApi } from "@/lib/profile-change-requests-store";

type ReferentLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function ReferentLayout({ children, title, subtitle }: ReferentLayoutProps) {
  const router = useRouter();
  const { session, logout, isReady, isAuthenticated } = useReferentSession();
  const { state } = useReferentCards();
  const stats = getReferentDashboardStats(state);
  const [pendingProfileRequests, setPendingProfileRequests] = useState(0);

  useEffect(() => {
    void fetchPendingRequestsFromApi().then((requests) => {
      setPendingProfileRequests(requests.length);
    });
  }, []);

  useEffect(() => {
    if (isReady && (!isAuthenticated || !session)) {
      window.location.assign("/referent/login");
    }
  }, [isReady, isAuthenticated, session]);

  if (!isReady) {
    return <StaffPanelLoadingShell panelLabel="Referent panel" />;
  }

  if (!isAuthenticated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-sm text-[var(--text-secondary)]">
        Preusmeravanje na prijavu...
      </div>
    );
  }

  return (
    <StaffShell
      badges={{ pendingActivations: stats.pendingActivations, pendingProfileRequests }}
      navItems={referentNavItems}
      onLogout={() => {
        logout();
        router.replace("/referent/login");
      }}
      panel="referent"
      panelIcon={CreditCard}
      session={session}
      subtitle={subtitle}
      title={title}
      topBarExtra={
        <span className="hidden rounded-full border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] sm:inline-flex">
          {stats.activeCards} aktivnih kartica
        </span>
      }
    >
      <div className="print:max-w-none">{children}</div>
    </StaffShell>
  );
}

export default ReferentLayout;
