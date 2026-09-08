"use client";

import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStudentSession } from "@/hooks/useStudentSession";
import { apiDelete, ApiError } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { clearRegisterDraft } from "@/lib/register-mock";
import type { AccountInfo } from "@/lib/podesavanja-mock";
import { SettingsShell } from "@/components/podesavanja/SettingsShell";

type AccountTabProps = {
  account: AccountInfo;
};

export function AccountTab({ account }: AccountTabProps) {
  const router = useRouter();
  const { logout, isDemo } = useStudentSession();
  const backend = isClientBackendEnabled();
  const canDeleteAccount = backend && !isDemo;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login?logout=1");
  }

  async function handleDeleteAccount() {
    if (!canDeleteAccount) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiDelete<{ ok: boolean }>("/api/auth/account");
      clearRegisterDraft();
      setDeleteSuccess(true);
      await logout();
      router.replace("/login?logout=1");
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Brisanje naloga nije uspelo.";
      setDeleteError(message);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SettingsShell
      description="Informacije o nalogu i opcije za odjavu ili brisanje."
      showActions={false}
      title="Nalog"
    >
      <dl className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-[#EFF1F4]/40">
        <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <dt className="text-xs font-semibold uppercase tracking-wide text-black/45">Tip naloga</dt>
          <dd className="text-sm font-semibold text-black">{account.accountType}</dd>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <dt className="text-xs font-semibold uppercase tracking-wide text-black/45">
            Datum registracije
          </dt>
          <dd className="text-sm font-semibold text-black">{account.registeredAt}</dd>
        </div>
      </dl>

      <button
        className="inline-flex items-center gap-2 rounded-full border-2 border-[#5055D2] bg-white px-6 py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5"
        onClick={() => void handleLogout()}
        type="button"
      >
        <LogOut aria-hidden="true" size={18} />
        Odjava
      </button>

      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-4 lg:p-5">
        <h3 className="text-sm font-bold text-red-800 lg:text-base">Opasna zona</h3>
        <p className="mt-1 text-sm font-light text-red-800/80">
          Brisanje naloga je trajno. Ukloniće se profil, kartica, rezervacije i podešavanja.
        </p>

        {deleteSuccess ? (
          <p className="mt-3 text-sm font-semibold text-red-800" role="status">
            Nalog je obrisan. Preusmeravamo vas na prijavu...
          </p>
        ) : null}

        {deleteError ? (
          <p className="mt-3 text-sm font-semibold text-red-800" role="alert">
            {deleteError}
          </p>
        ) : null}

        {!canDeleteAccount ? (
          <p className="mt-3 text-sm text-red-800/80">
            {isDemo
              ? "Demo nalog se briše odjavom — podaci ostaju lokalno u pregledaču."
              : "Brisanje naloga zahteva povezan backend."}
          </p>
        ) : showDeleteConfirm ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-red-800">
              Da li ste sigurni? Ova radnja se ne može poništiti.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => void handleDeleteAccount()}
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
                {isDeleting ? "Brisanje..." : "Potvrdi brisanje"}
              </button>
              <button
                className="rounded-full border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                type="button"
              >
                Otkaži
              </button>
            </div>
          </div>
        ) : (
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100/80"
            onClick={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
            Obriši nalog
          </button>
        )}
      </section>
    </SettingsShell>
  );
}
