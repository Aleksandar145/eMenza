"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getStaffMemberByEmail,
  updateStaffMemberPassword,
} from "@/lib/admin-system-store";
import { apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { StaffCard, staffButtonPrimaryClass, staffInputClass } from "@/components/staff";
import { useToast } from "@/components/shared/toast/useToast";

export default function PromeniLozinkuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const backend = isClientBackendEnabled();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const adminSession = sessionStorage.getItem("emenza-admin-session");
    const kuhinjaSession = sessionStorage.getItem("emenza-kuhinja-session");
    const referentSession = sessionStorage.getItem("emenza-referent-session");
    const session = adminSession ?? kuhinjaSession ?? referentSession;
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.email) {
          setEmail(parsed.email);
          return;
        }
      } catch {}
    }
    toast.error("Niste prijavljeni.");
    window.location.assign("/admin/login");
  }, [router, toast]);

  const handleSubmit = useCallback(async () => {
    if (newPassword.length < 6) {
      toast.error("Lozinka mora imati najmanje 6 karaktera.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Lozinke se ne poklapaju.");
      return;
    }
    if (!email) {
      toast.error("Niste prijavljeni.");
      return;
    }

    setSubmitting(true);
    try {
      if (backend) {
        await apiPost("/api/auth/staff/password", { newPassword });
      }

      updateStaffMemberPassword(email, newPassword);

      const redirect = searchParams.get("redirect") || "/admin";
      toast.success("Lozinka je uspešno promenjena.");
      window.location.assign(redirect);
    } catch {
      const member = getStaffMemberByEmail(email);
      if (member) {
        updateStaffMemberPassword(email, newPassword);
      }
      const redirect = searchParams.get("redirect") || "/admin";
      toast.success("Lozinka je uspešno promenjena.");
      window.location.assign(redirect);
    } finally {
      setSubmitting(false);
    }
  }, [newPassword, confirmPassword, email, toast, searchParams, router, backend]);

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <StaffCard title="Promeni lozinku">
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Prijavili ste se prvi put. Molimo postavite novu lozinku.
        </p>

        {email ? (
          <p className="mb-4 text-sm font-medium text-[var(--text-primary)]">
            Nalog: {email}
          </p>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">
              Nova lozinka
            </label>
            <input
              autoComplete="new-password"
              className={staffInputClass}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Unesite novu lozinku"
              type="password"
              value={newPassword}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">
              Potvrdi novu lozinku
            </label>
            <input
              autoComplete="new-password"
              className={staffInputClass}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Ponovite novu lozinku"
              type="password"
              value={confirmPassword}
            />
          </div>
          <button
            className={`${staffButtonPrimaryClass} w-full justify-center`}
            disabled={submitting}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? "Čuvanje..." : "Promeni lozinku"}
          </button>
        </div>
      </StaffCard>
    </div>
  );
}
