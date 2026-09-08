"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck } from "lucide-react";
import { StaffLoginPage } from "@/components/staff";
import { SuspendedNoticePopup } from "@/components/shared/SuspendedNoticePopup";
import { useReferentSession } from "@/hooks/useReferentSession";
import { getStaffMembers, hydrateAdminSystemFromStorage } from "@/lib/admin-system-store";

export function ReferentLoginForm() {
  const router = useRouter();
  const { login, logout, session, isAuthenticated, isReady } = useReferentSession();
  const [suspended, setSuspended] = useState<{ name: string; reason?: string } | null>(null);

  function checkSuspended(email: string) {
    hydrateAdminSystemFromStorage();
    const staff = getStaffMembers();
    const member = staff.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (member && !member.active) {
      setSuspended({ name: member.name, reason: member.suspendedReason });
      return true;
    }
    return false;
  }

  useEffect(() => {
    if (isReady && isAuthenticated && session && !suspended) {
      if (checkSuspended(session.email)) {
        logout();
        return;
      }
      if (session.mustChangePassword) {
        router.replace(`/promeni-lozinku?redirect=${encodeURIComponent("/referent")}`);
      } else {
        router.replace("/referent");
      }
    }
  }, [isReady, isAuthenticated, session, suspended, router, logout]);

  async function handleLogin(email: string, password: string) {
    try {
      const result = await login(email, password);
      if (!result) return false;

      if (checkSuspended(email)) {
        logout();
        return true;
      }

      if (result.mustChangePassword) {
        router.replace(`/promeni-lozinku?redirect=${encodeURIComponent("/referent")}`);
        return true;
      }

      router.push("/referent");
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
          "Aktivacija studentskih kartica",
          "Ručna dopuna i produženje važenja",
          "Pretraga kartica po QR ili broju",
          "Dnevni izveštaji o prometu",
        ]}
        disableRedirect
        gradientClass="from-[#5055D2] via-[#6368e0] to-[#9093E1]"
        icon={ShieldCheck}
        onLogin={handleLogin}
        panelLabel="Referent"
        redirectTo="/referent"
        submitIcon={CreditCard}
        subtitle="Šalter studentskog centra — kartice, dopune i verifikacija."
        title="Prijava referenta"
      />
    </>
  );
}

export default ReferentLoginForm;
