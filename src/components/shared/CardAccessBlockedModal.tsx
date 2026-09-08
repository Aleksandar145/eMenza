"use client";

import { useRouter } from "next/navigation";
import { Ban, LogOut } from "lucide-react";
import { useCardAccess } from "@/components/shared/CardAccessProvider";

function formatBlockPeriod(blockedUntil: string | undefined): string {
  if (!blockedUntil) return "Neograničeno";
  try {
    return new Intl.DateTimeFormat("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(blockedUntil));
  } catch {
    return blockedUntil;
  }
}

export function CardAccessBlockedModal() {
  const { blockedModalOpen, snapshot } = useCardAccess();
  const router = useRouter();

  if (!blockedModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <section
        aria-labelledby="card-blocked-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
        role="dialog"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
            <Ban size={32} className="text-red-600" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-black" id="card-blocked-title">
            Žao nam je, vaš nalog je privremeno blokiran
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-black/65">
            Tokom ove blokade nećete moći da koristite usluge eMenza platforme.
            Za više informacija obratite se administraciji lično.
          </p>
        </div>

        <div className="mt-5 space-y-2 rounded-xl bg-red-50 p-4 text-left">
          {snapshot.blockedReason && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase tracking-wide text-red-700 min-w-[60px]">
                Razlog:
              </span>
              <p className="text-sm font-medium text-red-800">{snapshot.blockedReason}</p>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase tracking-wide text-red-700 min-w-[60px]">
              Period:
            </span>
            <p className="text-sm font-medium text-red-800">
              {formatBlockPeriod(snapshot.blockedUntil)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5055D2] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f44b8]"
            onClick={() => router.push("/login")}
            type="button"
          >
            <LogOut size={16} />
            Nazad na prijavu
          </button>
        </div>
      </section>
    </div>
  );
}

export default CardAccessBlockedModal;
