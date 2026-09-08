"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useAdminSystem } from "@/hooks/useAdminSystem";

type AdminSyncBannerProps = {
  className?: string;
};

export function AdminSyncBanner({ className = "" }: AdminSyncBannerProps) {
  const { syncFailed, isSyncing, retrySync, hasCachedState, hasSuccessfulRemoteSync, lastSyncError } =
    useAdminSystem();

  if (!syncFailed || isSyncing) {
    return null;
  }

  if (hasCachedState && hasSuccessfulRemoteSync) {
    return null;
  }

  const isSoftWarning = hasCachedState;
  const title = isSoftWarning
    ? "Sinhronizacija sa serverom nije uspela"
    : "Podešavanja možda nisu ažurna";

  const description = isSoftWarning
    ? lastSyncError === "timeout"
      ? "Server je odgovorio presporo. Prikazujemo poslednju sačuvanu verziju podešavanja — kliknite „Pokušaj ponovo“ kad budete spremni."
      : "Prikazujemo poslednju sačuvanu verziju podešavanja. Proverite konekciju i pokušajte ponovo."
    : lastSyncError === "timeout"
      ? "Server nije stigao da odgovori na vreme. Cene, radno vreme ili pravila rezervacija možda nisu učitana."
      : "Nismo uspeli da učitamo najnovija podešavanja restorana. Prikazujemo podrazumevanu verziju — cene, radno vreme ili pravila rezervacija mogu biti zastarela.";

  return (
    <section
      className={`overflow-hidden rounded-[20px] border p-4 shadow-[0_2px_12px_rgba(71,85,105,0.08)] lg:p-5 ${
        isSoftWarning
          ? "border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5"
          : "border-slate-400/25 bg-gradient-to-br from-slate-500/10 via-white to-slate-500/5"
      } ${className}`}
      role="status"
    >
      <div className="flex gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
            isSoftWarning ? "bg-amber-500/15" : "bg-slate-500/15"
          }`}
        >
          <WifiOff
            aria-hidden="true"
            className={isSoftWarning ? "text-amber-700" : "text-slate-700"}
            size={20}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm font-light leading-relaxed text-slate-800/75">{description}</p>
          <button
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-600/25 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-white disabled:opacity-60"
            disabled={isSyncing}
            onClick={() => void retrySync()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={isSyncing ? "animate-spin" : ""} size={14} />
            {isSyncing ? "Učitavam..." : "Pokušaj ponovo"}
          </button>
        </div>
      </div>
    </section>
  );
}
