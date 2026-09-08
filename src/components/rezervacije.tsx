"use client";



import { useSearchParams } from "next/navigation";

import { useEffect, useRef, useState } from "react";

import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/components/shared/toast/useToast";

import { AiRecommendationModal } from "@/components/ai-preporuka/AiRecommendationModal";

import { CancelReservationModal } from "@/components/rezervacije/CancelReservationModal";
import { DayMealPlanner } from "@/components/rezervacije/DayMealPlanner";

import { IftarPonetiBanner } from "@/components/dashboard/IftarPonetiBanner";

import { PlanningWeekStrip } from "@/components/rezervacije/PlanningWeekStrip";

import { RecentOrderHistoryList } from "@/components/rezervacije/RecentOrderHistoryList";

import { ReservationPolicyCollapsible } from "@/components/rezervacije/ReservationPolicyCollapsible";

import { RezervacijePageHeader } from "@/components/rezervacije/RezervacijePageHeader";

import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";

import { ApiError } from "@/lib/api/client";
import { useMealBookingActions } from "@/hooks/useMealBookingActions";

import { useMealReservations } from "@/hooks/useMealReservations";
import { useStudentSession } from "@/hooks/useStudentSession";

import { useClientMounted } from "@/hooks/useClientMounted";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useT } from "@/i18n/useT";

import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { parseDateKey } from "@/lib/calendar-utils";
import { getSsrAlignDateKey } from "@/lib/date-utils";
import {
  formatCalendarDayLabel,
  getMealDetailsForDay,
  getPrimaryMealTabForDay,
  type MealType,
} from "@/lib/dashboard-mock";

import {
  buildMealDetailsForDay,
  formatPurchasedMealSummary,
  formatRefundRsd,
  getReservationRefundRsd,
} from "@/lib/reservations-view";

import { parseRezervacijeSearchParams } from "@/lib/rezervacije-mock";
import { isClientBackendEnabled } from "@/lib/backend-config";
import {
  hydrateStudentMenuCaches,
  syncPublishedMenuFromApi,
} from "@/lib/kuhinja-jelovnik-store";



export function Rezervacije() {

  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useT();
  const mounted = useClientMounted();
  const todayDateKey = useTodayDateKey();

  const parsedParams = parseRezervacijeSearchParams(searchParams);

  const urlDateKey =
    parsedParams.dateKey && parseDateKey(parsedParams.dateKey) ? parsedParams.dateKey : undefined;

  const {

    aiModalOpen,

    aiModalDateKey,

    aiRecommendation,

    openKreator,

    openAiPreporuka,

    closeAiModal,

  } = useMealBookingActions();



  const [selectedDateKey, setSelectedDateKey] = useState(() => getSsrAlignDateKey());

  const [activeMealTab, setActiveMealTab] = useState<MealType>(
    () => getPrimaryMealTabForDay(getSsrAlignDateKey()),
  );

  const hasInitialDateSyncRef = useRef(false);
  const { isAuthenticated, isDemo, isSessionValidated } = useStudentSession();

  useEffect(() => {
    if (!mounted || hasInitialDateSyncRef.current) {
      return;
    }

    hasInitialDateSyncRef.current = true;

    if (urlDateKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDateKey(urlDateKey);
      if (parsedParams.obrok) {
        setActiveMealTab(parsedParams.obrok);
      } else {
        setActiveMealTab(getPrimaryMealTabForDay(urlDateKey));
      }
      return;
    }

    setSelectedDateKey(todayDateKey);
    if (!parsedParams.obrok) {
      setActiveMealTab(getPrimaryMealTabForDay(todayDateKey));
    }
  }, [mounted, urlDateKey, todayDateKey, parsedParams.obrok]);

  useEffect(() => {
    if (!isClientBackendEnabled() || !isAuthenticated || isDemo || !isSessionValidated) {
      return;
    }

    hydrateStudentMenuCaches();
    void syncPublishedMenuFromApi(selectedDateKey, activeMealTab);
  }, [selectedDateKey, activeMealTab, isAuthenticated, isDemo, isSessionValidated]);

  const [reservationVersion, setReservationVersion] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<{
    mealType: MealType;
    refundRsd: number;
    mealLabel: string;
    dateLabel: string;
    itemsSummary: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { settings } = useUserSettings();

  const { snapshot, refreshCard } = useCardAccess();

  const { reservations, usesBackend, cancelReservation, refresh } = useMealReservations();

  function handleDateChange(dateKey: string) {

    setSelectedDateKey(dateKey);

    setActiveMealTab(getPrimaryMealTabForDay(dateKey));

  }



  function handleSmartReserve(dateKey: string, mealType: MealType) {

    setSelectedDateKey(dateKey);

    setActiveMealTab(mealType);

    openKreator(dateKey, mealType);

  }



  function handleCancelRequest(mealType: MealType) {
    const refundRsd = getReservationRefundRsd(
      selectedDateKey,
      mealType,
      usesBackend ? reservations : undefined,
    );
    const { sections } = usesBackend
      ? buildMealDetailsForDay(selectedDateKey, reservations)
      : getMealDetailsForDay(selectedDateKey);
    const section = sections.find((entry) => entry.type === mealType);

    setCancelTarget({
      mealType,
      refundRsd,
      mealLabel: section?.title ?? mealType,
      dateLabel: formatCalendarDayLabel(selectedDateKey),
      itemsSummary: section?.items ? formatPurchasedMealSummary(section.items) : "",
    });
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) {
      return;
    }

    setIsCancelling(true);

    try {
      const result = await cancelReservation(selectedDateKey, cancelTarget.mealType);

      if (result.success) {
        setCancelTarget(null);
        setReservationVersion((current) => current + 1);
        refreshCard();
        if (usesBackend) {
          await refresh();
        }
        toast.success(
          result.refundRsd > 0
            ? `Rezervacija otkazana. Vraćeno ${formatRefundRsd(result.refundRsd)} RSD na karticu.`
            : "Rezervacija otkazana.",
        );
      } else {
        toast.error(t("server.cancelFailed"));
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("server.cancelFailed");
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  }



  const pickupContext = usesBackend

    ? {

        studentName: `${settings.profile.firstName} ${settings.profile.lastName}`.trim(),

        cardId: snapshot.cardId,

        cardDisplayNumber: snapshot.maskedNumber,

      }

    : undefined;



  return (

    <AppLayout
      activeItem={t("nav.items.reservations")}
      subtitle={t("reservations.pageSubtitle")}
      title={t("reservations.pageTitle")}
    >

      <div className="mx-auto max-w-4xl space-y-5">

        <RezervacijePageHeader onSmartReserve={handleSmartReserve} />

        <MealBookingLockedSection>
          <PlanningWeekStrip
            fasting={settings.fasting}
            onReserve={(dateKey) => openKreator(dateKey)}
            onSelectedDateChange={handleDateChange}
            religion={settings.profile.religion}
            selectedDateKey={selectedDateKey}
          />
        </MealBookingLockedSection>

        {activeMealTab === "dinner" ? (
          <MealBookingLockedSection>
            <IftarPonetiBanner
              dateKey={selectedDateKey}
              fasting={settings.fasting}
              religion={settings.profile.religion}
            />
          </MealBookingLockedSection>
        ) : null}

        <MealBookingLockedSection>
          <DayMealPlanner
            activeMealTab={activeMealTab}
            apiReservations={usesBackend ? reservations : undefined}
            fasting={settings.fasting}
            key={`${selectedDateKey}-${reservationVersion}-${reservations.length}`}
            onAiRecommend={() => openAiPreporuka(selectedDateKey, activeMealTab)}
            onCancel={handleCancelRequest}
            onMealTabChange={setActiveMealTab}
            onReserve={(obrok) => openKreator(selectedDateKey, obrok)}
            pickupContext={pickupContext}
            religion={settings.profile.religion}
            refundRsd={getReservationRefundRsd(
              selectedDateKey,
              activeMealTab,
              usesBackend ? reservations : undefined,
            )}
            selectedDateKey={selectedDateKey}
          />
        </MealBookingLockedSection>

        <MealBookingLockedSection>
          <RecentOrderHistoryList
            refreshKey={reservationVersion}
            reservations={usesBackend ? reservations : undefined}
          />
        </MealBookingLockedSection>



        <ReservationPolicyCollapsible />

      </div>



      <AiRecommendationModal

        dateKey={aiModalDateKey ?? selectedDateKey}

        isOpen={aiModalOpen}

        onClose={closeAiModal}

        recommendation={aiRecommendation}

      />

      {cancelTarget ? (
        <CancelReservationModal
          dateLabel={cancelTarget.dateLabel}
          isSubmitting={isCancelling}
          itemsSummary={cancelTarget.itemsSummary}
          mealLabel={cancelTarget.mealLabel}
          onClose={() => {
            if (!isCancelling) {
              setCancelTarget(null);
            }
          }}
          onConfirm={() => void handleConfirmCancel()}
          refundRsd={cancelTarget.refundRsd}
        />
      ) : null}

    </AppLayout>

  );

}



export default Rezervacije;

