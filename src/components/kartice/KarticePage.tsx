"use client";

import { useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { DopuniKarticuModal } from "@/components/dashboard/DopuniKarticuModal";
import { StudentCardQrDisplay } from "@/components/kartice/StudentCardQrDisplay";
import { StudentWalletCard } from "@/components/kartice/StudentWalletCard";
import { CardStatusBanner } from "@/components/shared/CardStatusBanner";
import { useCardAccess } from "@/components/shared/CardAccessProvider";

export function KarticePage() {
  const { snapshot } = useCardAccess();
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  return (
    <AppLayout
      activeItem="Moje kartice"
      subtitle="Pregled studentske kartice, stanja i važenja."
      title="Moje kartice"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <CardStatusBanner />

        <StudentWalletCard snapshot={snapshot} />

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-[#5055D2] px-5 py-2.5 text-sm font-semibold text-white"
            onClick={() => setIsTopUpOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Dopuni karticu
          </button>
        </div>

        <StudentCardQrDisplay cardId={snapshot.cardId} />

        <section className="rounded-[20px] border border-black/5 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[#5055D2]/10">
              <CreditCard aria-hidden="true" className="text-[#5055D2]" size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-black">Aktivacija i produženje</h2>
              <p className="mt-1 text-sm font-light text-black/55">
                Novu karticu verifikujte kod referenta studentskog centra. Produženje važenja i ručna
                dopuna takođe se obavljaju na šalteru referenta.
              </p>
            </div>
          </div>
        </section>
      </div>

      <DopuniKarticuModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />
    </AppLayout>
  );
}

export default KarticePage;
