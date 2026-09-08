"use client";

import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StaffLoginPage } from "@/components/staff";
import { SuspendedNoticePopup } from "@/components/shared/SuspendedNoticePopup";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { getStaffMembers, hydrateAdminSystemFromStorage } from "@/lib/admin-system-store";

function checkSuspended(email: string): { name: string; reason?: string } | null {
  hydrateAdminSystemFromStorage();
  const staff = getStaffMembers();
  const member = staff.find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (member && !member.active) {
    return { name: member.name, reason: member.suspendedReason };
  }
  return null;
}

export function KuhinjaLoginForm() {
  const router = useRouter();
  const { login, logout, session, isReady, isAuthenticated } = useKuhinjaSessionContext();
  const [suspended, setSuspended] = useState<{ name: string; reason?: string } | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated && session && !suspended) {
      const s = checkSuspended(session.email);
      if (s) {
        setSuspended(s);
        logout();
        return;
      }
      if (session.mustChangePassword) {
        router.replace(`/promeni-lozinku?redirect=${encodeURIComponent("/kuhinja")}`);
      } else {
        router.replace("/kuhinja");
      }
    }
  }, [isReady, isAuthenticated, session, suspended, router, logout]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await login(email, password);
        if (!result) return false;

        const s = checkSuspended(email);
        if (s) {
          setSuspended(s);
          logout();
          return true;
        }

        if (result.mustChangePassword) {
          router.replace(`/promeni-lozinku?redirect=${encodeURIComponent("/kuhinja")}`);
          return true;
        }

        router.replace("/kuhinja");
        return true;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "suspended" in err) {
          const s = err as unknown as { displayName: string; suspendedReason?: string };
          setSuspended({ name: s.displayName, reason: s.suspendedReason });
          logout();
          return true;
        }
        return false;
      }
    },
    [login, logout, router],
  );

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D9D9D9] text-sm text-black/55">
        Učitavanje...
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D9D9D9] text-sm text-black/55">
        Preusmeravanje u panel...
      </div>
    );
  }

  return (
    <>
      {suspended && (
        <SuspendedNoticePopup
          name={suspended.name}
          reason={suspended.reason}
          onBackToLogin={() => setSuspended(null)}
        />
      )}
      <StaffLoginPage
        benefits={[
          "Pristup zavisi od uloge — Moderator, Kuvar ili Operater šaltera",
          "Generalno (pregled, obaveštenja) — svi zaposleni",
          "Šalter i vraćanje žetona — moderator i operater šaltera",
          "Jelovnik i priprema — moderator i kuvar",
        ]}
        disableRedirect
        gradientClass="from-[#1F2937] to-[#5055D2]"
        icon={UtensilsCrossed}
        onLogin={handleLogin}
        panelLabel="Kuhinja"
        redirectTo="/kuhinja"
        submitIcon={UtensilsCrossed}
        subtitle="Operativni panel sa ulogama — pristup zavisi od vaše pozicije u menzi."
        title="Prijava kuhinje"
      />
    </>
  );
}

export default KuhinjaLoginForm;
