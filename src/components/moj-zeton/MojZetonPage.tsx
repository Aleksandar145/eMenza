"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { useToast } from "@/components/shared/toast/useToast";
import { ZetonFlowSteps } from "@/components/moj-zeton/ZetonFlowSteps";
import { ZetonHistoryList } from "@/components/moj-zeton/ZetonHistoryList";
import { ZetonNoTokenView } from "@/components/moj-zeton/ZetonNoTokenView";
import { ZetonPurchaseModal } from "@/components/moj-zeton/ZetonPurchaseModal";
import { ZetonStatusCard } from "@/components/moj-zeton/ZetonStatusCard";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useDemoStudentZeton } from "@/hooks/useEzeton";
import { getZetonDepositRsd } from "@/lib/admin-system-store";
import { shouldUseEzetonApi, purchaseTokenViaApi, reactivateTokenViaApi } from "@/lib/backend/ezeton-api";
import { ApiError } from "@/lib/api/client";
import { ezetonIntro } from "@/lib/ezeton-mock";
import { DEMO_STUDENT_TOKEN_CODE, purchaseZetonForStudent, reactivateZetonForStudent } from "@/lib/ezeton-store";

const noTokenSubtitle = "Aktivirajte žeton za preuzimanje na šalteru.";

export function MojZetonPage() {
  useAdminSystem();
  const depositRsd = getZetonDepositRsd();
  const { record, refresh } = useDemoStudentZeton();
  const { guardAction, snapshot, refreshCard } = useCardAccess();
  const toast = useToast();
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [reactivateModalOpen, setReactivationModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const hasNoToken = record.zeton.status === "none";
  const isUsed = record.zeton.status === "used";

  function handleBuyClick() {
    guardAction(() => {
      setPurchaseModalOpen(true);
    });
  }

  function handleReactivateClick() {
    guardAction(() => {
      setReactivationModalOpen(true);
    });
  }

  async function handlePurchaseConfirm() {
    setIsPurchasing(true);

    try {
      if (shouldUseEzetonApi()) {
        try {
          await purchaseTokenViaApi(depositRsd);
        } catch (error) {
          const message =
            error instanceof ApiError ? error.message : "Naplata kaucije nije uspela.";
          toast.error(message);
          return;
        }
        toast.success("Žeton je uspešno aktiviran.");
        setPurchaseModalOpen(false);
        refresh();
        refreshCard();
        return;
      }

      const result = purchaseZetonForStudent(DEMO_STUDENT_TOKEN_CODE, depositRsd, {
        cardId: snapshot.cardId,
        cardNumber: snapshot.cardNumber,
        skipCardCharge: shouldUseEzetonApi(),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Žeton je uspešno aktiviran.");
      setPurchaseModalOpen(false);
      refresh();
      refreshCard();
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handleReactivateConfirm() {
    setIsPurchasing(true);

    try {
      if (shouldUseEzetonApi()) {
        try {
          await reactivateTokenViaApi(depositRsd);
        } catch (error) {
          const message =
            error instanceof ApiError ? error.message : "Reaktivacija nije uspela.";
          toast.error(message);
          return;
        }
        toast.success("Žeton je ponovo aktivan.");
        setReactivationModalOpen(false);
        refresh();
        refreshCard();
        return;
      }

      const result = reactivateZetonForStudent(DEMO_STUDENT_TOKEN_CODE, depositRsd, {
        cardId: snapshot.cardId,
        cardNumber: snapshot.cardNumber,
        skipCardCharge: shouldUseEzetonApi(),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Žeton je ponovo aktivan.");
      setReactivationModalOpen(false);
      refresh();
      refreshCard();
    } finally {
      setIsPurchasing(false);
    }
  }

  return (
    <AppLayout
      subtitle={hasNoToken ? noTokenSubtitle : ezetonIntro.description}
      title="Moj zeton"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        {hasNoToken ? (
          <MealBookingLockedSection>
            <ZetonNoTokenView depositRsd={depositRsd} onBuyClick={handleBuyClick} />
          </MealBookingLockedSection>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_1fr] lg:items-stretch">
              <MealBookingLockedSection>
                <ZetonStatusCard depositRsd={depositRsd} zeton={record.zeton} />
              </MealBookingLockedSection>

              <MealBookingLockedSection>
                <ZetonFlowSteps />
              </MealBookingLockedSection>
            </div>

            {isUsed ? (
              <MealBookingLockedSection>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-900">
                    Pribor je preuzet — žeton je iskorišćen.
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Vratite pribor u restoran i zatražite od osoblja da vam aktivira žeton. Ako želite da platite kauciju za reaktivaciju, to možete uraditi ovde.
                  </p>
                  <button
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#5055D2] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    onClick={handleReactivateClick}
                    type="button"
                  >
                    Plati za reaktivaciju ({depositRsd.toLocaleString("sr-RS")} RSD)
                  </button>
                </div>
              </MealBookingLockedSection>
            ) : null}

            <MealBookingLockedSection>
              <ZetonHistoryList events={record.history} />
            </MealBookingLockedSection>
          </>
        )}
      </div>

      {purchaseModalOpen ? (
        <ZetonPurchaseModal
          depositRsd={depositRsd}
          isSubmitting={isPurchasing}
          onClose={() => {
            if (!isPurchasing) {
              setPurchaseModalOpen(false);
            }
          }}
          onConfirm={() => {
            void handlePurchaseConfirm();
          }}
        />
      ) : null}

      {reactivateModalOpen ? (
        <ZetonPurchaseModal
          depositRsd={depositRsd}
          isSubmitting={isPurchasing}
          onClose={() => {
            if (!isPurchasing) {
              setReactivationModalOpen(false);
            }
          }}
          onConfirm={() => {
            void handleReactivateConfirm();
          }}
        />
      ) : null}
    </AppLayout>
  );
}

export default MojZetonPage;
