"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { fetchAiRecommendationFromApi } from "@/lib/backend/ai-preporuka-api";
import {
  buildRecommendationFromRpcRows,
  generateDishRecommendation,
  getAiPreporukaHref,
  type AiRecommendation,
} from "@/lib/ai-preporuka-mock";
import {
  getMealDetailsForDay,
  getSuggestedObrokForDay,
  isDayAvailableForReservation,
  type MealType,
} from "@/lib/dashboard-mock";
import { getKreatorObrokaHref } from "@/lib/kreator-obroka-mock";
import { canBookMealSlot, canShowAiPreporuka } from "@/lib/meal-booking-window";
import { buildMealDetailsForDay } from "@/lib/reservations-view";
import { useMealReservations } from "@/hooks/useMealReservations";
import { useUserSettings } from "@/hooks/useUserSettings";
import { shouldPreferPosnoMeals } from "@/lib/fasting-preferences";
import { loadDishWishlist } from "@/lib/dish-wishlist-store";

export function useMealBookingActions() {
  const router = useRouter();
  const { guardAction, snapshot } = useCardAccess();
  const { reservations, usesBackend } = useMealReservations();
  const { settings } = useUserSettings();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [aiModalDateKey, setAiModalDateKey] = useState<string | null>(null);

  const openKreator = useCallback(
    (dateKey: string, obrok?: MealType) => {
      if (!isDayAvailableForReservation(dateKey)) return;

      const { sections } = usesBackend
        ? buildMealDetailsForDay(dateKey, reservations)
        : getMealDetailsForDay(dateKey);
      const resolvedObrok = obrok ?? getSuggestedObrokForDay(dateKey);
      const targetSection = sections.find((section) => section.type === resolvedObrok);

      if (
        !targetSection ||
        !canBookMealSlot(dateKey, resolvedObrok, targetSection.status)
      ) {
        const fallback = sections.find((section) =>
          canBookMealSlot(dateKey, section.type, section.status),
        );

        if (!fallback) return;

        guardAction(() => {
          router.push(getKreatorObrokaHref({ dateKey, obrok: fallback.type }));
        });
        return;
      }

      guardAction(() => {
        router.push(getKreatorObrokaHref({ dateKey, obrok: resolvedObrok }));
      });
    },
    [guardAction, reservations, router, usesBackend],
  );

  const openAiPreporuka = useCallback(
    (dateKey: string, obrok?: MealType) => {
      const resolvedObrok = obrok ?? getSuggestedObrokForDay(dateKey);

      if (!canShowAiPreporuka(dateKey, resolvedObrok)) return;

      guardAction(() => {
        void (async () => {
          const preferPosno = shouldPreferPosnoMeals(
            settings.profile.religion,
            dateKey,
            settings.fasting,
          );
          const balanceRsd = snapshot?.balanceRsd ?? 500;
          const wishlist = loadDishWishlist();

          try {
            const rows = await fetchAiRecommendationFromApi({
              dateKey,
              mealType: resolvedObrok,
              posnoRequired: preferPosno,
            });
            const recommendation = buildRecommendationFromRpcRows(rows, resolvedObrok);

            if (recommendation) {
              setAiModalDateKey(dateKey);
              setAiRecommendation(recommendation);
              setAiModalOpen(true);
              return;
            }
          } catch {
            if (usesBackend) {
              router.push(getAiPreporukaHref());
              return;
            }
          }

          const fallback = generateDishRecommendation({
            wishlist,
            obrok: resolvedObrok,
            dateKey,
            balanceRsd,
            preferPosno,
            forceNonPosno: false,
          });

          if (fallback) {
            setAiModalDateKey(dateKey);
            setAiRecommendation(fallback);
            setAiModalOpen(true);
            return;
          }

          router.push(getAiPreporukaHref());
        })();
      });
    },
    [guardAction, router, settings, usesBackend, snapshot?.balanceRsd],
  );

  const closeAiModal = useCallback(() => {
    setAiModalOpen(false);
  }, []);

  const refreshAiRecommendation = useCallback((rec: AiRecommendation) => {
    setAiRecommendation(rec);
  }, []);

  return {
    aiModalOpen,
    aiModalDateKey,
    aiRecommendation,
    openKreator,
    openAiPreporuka,
    closeAiModal,
    refreshAiRecommendation,
  };
}

export default useMealBookingActions;
