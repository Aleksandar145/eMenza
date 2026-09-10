"use client";

import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { AiRecommendationModal } from "@/components/ai-preporuka/AiRecommendationModal";
import { BalanceMiniStrip } from "@/components/dashboard/BalanceMiniStrip";
import { CompactWeekStrip } from "@/components/dashboard/CompactWeekStrip";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { QuickActionsRow } from "@/components/dashboard/QuickActionsRow";
import { TodayHeroCard } from "@/components/dashboard/TodayHeroCard";
import { IftarPonetiBanner } from "@/components/dashboard/IftarPonetiBanner";
import { TodayMealSummary } from "@/components/dashboard/TodayMealSummary";
import { CardStatusBanner } from "@/components/shared/CardStatusBanner";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import { useMealBookingActions } from "@/hooks/useMealBookingActions";
import { useClientMounted } from "@/hooks/useClientMounted";
import { usePosnoHighlight } from "@/hooks/usePosnoHighlight";
import { useStudentSession } from "@/hooks/useStudentSession";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { getSsrAlignDateKey } from "@/lib/date-utils";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { getSuggestedObrokForDay } from "@/lib/dashboard-mock";
import { syncPublishedMenuFromApi } from "@/lib/kuhinja-jelovnik-store";

export function Dashboard() {
  const mounted = useClientMounted();
  const todayDateKey = useTodayDateKey();
  const [selectedDateKey, setSelectedDateKey] = useState(getSsrAlignDateKey);
  const hasInitialDateSyncRef = useRef(false);

  useEffect(() => {
    if (!mounted || hasInitialDateSyncRef.current) {
      return;
    }

    hasInitialDateSyncRef.current = true;
    setSelectedDateKey(todayDateKey);
  }, [mounted, todayDateKey]);

  const { sessionStatus, session, isSessionValidated, isAuthenticated, isDemo } =
    useStudentSession();

  useEffect(() => {
    if (!isClientBackendEnabled() || !isAuthenticated || isDemo || !isSessionValidated) {
      return;
    }

    void syncPublishedMenuFromApi(selectedDateKey, getSuggestedObrokForDay(selectedDateKey));
  }, [selectedDateKey, isAuthenticated, isDemo, isSessionValidated]);

  const { settings } = useUserSettings();
  const showPageSkeleton =
    !mounted ||
    (sessionStatus === "loading" && !session && !isSessionValidated);
  const { showPosnoMeals } = usePosnoHighlight(
    todayDateKey,
    settings.profile.religion,
    settings.fasting,
  );
  const {
    aiModalOpen,
    aiModalDateKey,
    aiRecommendation,
    openKreator,
    openAiPreporuka,
    closeAiModal,
    refreshAiRecommendation,
  } = useMealBookingActions();

  function scrollToMealSummary() {
    document.getElementById("today-meal-summary")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  return (
    <AppLayout>
      {showPageSkeleton ? (
        <DashboardPageSkeleton />
      ) : (
      <div className="space-y-5">
        <DashboardTopBar />

        <CardStatusBanner />

        <TodayHeroCard
          onAiRecommend={() => openAiPreporuka(todayDateKey)}
          onReserve={(mealType) => openKreator(todayDateKey, mealType)}
          onViewDetails={scrollToMealSummary}
        />

        <QuickActionsRow
          dateKey={selectedDateKey}
          onAiRecommend={() => openAiPreporuka(selectedDateKey)}
          onReserve={(obrok) => openKreator(selectedDateKey, obrok)}
        />

        <BalanceMiniStrip />

        <MealBookingLockedSection>
          <IftarPonetiBanner
            dateKey={selectedDateKey}
            fasting={settings.fasting}
            religion={settings.profile.religion}
          />
        </MealBookingLockedSection>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <MealBookingLockedSection>
            <CompactWeekStrip
              fasting={settings.fasting}
              onSelectedDateChange={setSelectedDateKey}
              religion={settings.profile.religion}
              selectedDateKey={selectedDateKey}
            />
          </MealBookingLockedSection>
          <MealBookingLockedSection>
            <TodayMealSummary showPosnoMeals={showPosnoMeals} />
          </MealBookingLockedSection>
        </div>
      </div>
      )}

      <AiRecommendationModal
        dateKey={aiModalDateKey ?? selectedDateKey}
        isOpen={aiModalOpen}
        onClose={closeAiModal}
        onRefreshRecommendation={refreshAiRecommendation}
        recommendation={aiRecommendation}
      />
    </AppLayout>
  );
}

export default Dashboard;
