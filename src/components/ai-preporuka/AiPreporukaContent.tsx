"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AiRecommendationCard } from "@/components/ai-preporuka/AiRecommendationCard";
import { DishCatalog } from "@/components/ai-preporuka/DishCatalog";
import { DishRankingsTable } from "@/components/ai-preporuka/DishRankingsTable";
import { fetchAiRecommendationFromApi } from "@/lib/backend/ai-preporuka-api";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { shouldPreferPosnoMeals } from "@/lib/fasting-preferences";
import { creatorSlotOrder, type CreatorSlotId } from "@/lib/kreator-obroka-mock";
import {
  buildRecommendationFromRpcRows,
  generateDishRecommendation,
  type AiRecommendation,
} from "@/lib/ai-preporuka-mock";
import {
  loadDishWishlist,
  saveDishWishlist,
  addDishRanking,
  removeDishRanking,
  moveDishRanking,
  type DishWishlist,
} from "@/lib/dish-wishlist-store";

export type AiPreporukaVariant = "portal" | "onboarding";

type AiPreporukaContentProps = {
  variant?: AiPreporukaVariant;
  onComplete?: () => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
};

function getWishlistKeys(wishlist: DishWishlist, slotId: CreatorSlotId): Set<string> {
  return new Set((wishlist[slotId] ?? []).map((r) => r.dishId));
}

export function AiPreporukaContent({
  variant = "portal",
  onComplete,
  onSkip,
}: AiPreporukaContentProps) {
  const router = useRouter();
  const { settings } = useUserSettings();
  const { snapshot } = useCardAccess();
  const todayDateKey = useTodayDateKey();
  const isOnboarding = variant === "onboarding";

  const preferPosno = shouldPreferPosnoMeals(
    settings.profile.religion,
    todayDateKey,
    settings.fasting,
  );

  const balanceRsd = snapshot?.balanceRsd ?? 500;

  const [wishlist, setWishlist] = useState<DishWishlist>(() => loadDishWishlist());
  const [isSaving, setIsSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [forceNonPosno, setForceNonPosno] = useState(false);

  const hasRankings = creatorSlotOrder.some(
    (slotId) => (wishlist[slotId]?.length ?? 0) > 0,
  );

  useEffect(() => {
    if (isOnboarding) return;

    let cancelled = false;

    async function loadRecommendation() {
      setIsRecommendationLoading(true);
      setRecommendationError(null);

      const obrok = "lunch";

      try {
        const rows = await fetchAiRecommendationFromApi({
          dateKey: todayDateKey,
          mealType: obrok,
          posnoRequired: preferPosno,
          forceNonPosno,
        });

        if (!cancelled) {
          setRecommendation(buildRecommendationFromRpcRows(rows, obrok));
        }
      } catch {
        if (!cancelled) {
          const fallback = generateDishRecommendation({
            wishlist,
            obrok,
            dateKey: todayDateKey,
            balanceRsd,
            preferPosno,
            forceNonPosno,
          });
          if (!cancelled) {
            setRecommendation(fallback);
            setRecommendationError(fallback ? null : "Nema dostupne preporuke za izabrani obrok.");
          }
        }
      } finally {
        if (!cancelled) {
          setIsRecommendationLoading(false);
        }
      }
    }

    void loadRecommendation();

    return () => { cancelled = true; };
  }, [forceNonPosno, isOnboarding, preferPosno, todayDateKey, wishlist, balanceRsd]);

  const wishlistKeysBySlot = useMemo(
    () => Object.fromEntries(
      creatorSlotOrder.map((slotId) => [slotId, getWishlistKeys(wishlist, slotId)]),
    ) as Record<CreatorSlotId, Set<string>>,
    [wishlist],
  );

  function handleAddDish(slotId: CreatorSlotId, dishId: string) {
    setWishlist((current) => {
      const next = addDishRanking(current, slotId, dishId);
      saveDishWishlist(next);
      return next;
    });
  }

  function handleRemoveDish(slotId: CreatorSlotId, dishId: string) {
    setWishlist((current) => {
      const next = removeDishRanking(current, slotId, dishId);
      saveDishWishlist(next);
      return next;
    });
  }

  function handleMoveDish(slotId: CreatorSlotId, dishId: string, direction: "up" | "down") {
    setWishlist((current) => {
      const next = moveDishRanking(current, slotId, dishId, direction);
      saveDishWishlist(next);
      return next;
    });
  }

  async function handleSave() {
    if (!hasRankings) return;
    setIsSaving(true);
    saveDishWishlist(wishlist);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSaving(false);
    if (onComplete) await onComplete();
    else router.push("/");
  }

  async function handleSkipOnboarding() {
    if (onSkip) await onSkip();
    else if (onComplete) await onComplete();
    else router.push("/");
  }

  return (
    <>
      <div className="mb-5 space-y-4 rounded-2xl border border-black/5 bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] lg:px-5">
        <p className="text-sm font-light text-black/55">
          {isOnboarding
            ? "Postavite omiljena jela za svaku kategoriju i rangirajte ih po važnosti."
            : "Rangirajte jela po važnosti unutar svake kategorije. AI preporučuje najbolje jelo iz liste."}
        </p>
      </div>

      {!isOnboarding && preferPosno ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#2f8f55]/20 bg-[#2f8f55]/5 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm font-medium text-[#2f8f55]">
            Post je aktivan — preporuka koristi samo posna jela sa današnjeg jelovnika.
          </p>
          <button
            aria-pressed={forceNonPosno}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              forceNonPosno
                ? "bg-[#5055D2] text-white"
                : "border border-[#5055D2] bg-white text-[#5055D2] hover:bg-[#5055D2]/5"
            }`}
            onClick={() => setForceNonPosno((current) => !current)}
            type="button"
          >
            {forceNonPosno ? "Vrati posnu preporuku" : "Generiši mrsnu hranu"}
          </button>
        </div>
      ) : null}

      {!isOnboarding && isRecommendationLoading ? (
        <div className="mb-5 rounded-2xl border border-[#5055D2]/15 bg-white px-5 py-4 text-sm font-medium text-black/55">
          Učitavam AI preporuku...
        </div>
      ) : null}

      {!isOnboarding && !isRecommendationLoading && recommendation ? (
        <div className="mb-5">
          <AiRecommendationCard
            dateKey={todayDateKey}
            recommendation={recommendation}
          />
        </div>
      ) : null}

      {!isOnboarding && !isRecommendationLoading && !recommendation ? (
        <div className="mb-5 rounded-2xl border border-dashed border-[#5055D2]/25 bg-[#5055D2]/5 px-5 py-4 text-sm font-light text-black/65">
          {recommendationError ??
            "Nema dostupne preporuke. Dodajte jela u listu želja."}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="order-2 lg:order-1">
          <DishRankingsTable
            canProceed={hasRankings}
            wishlist={wishlist}
            isGenerating={isSaving}
            onGenerate={handleSave}
            onMove={handleMoveDish}
            onRemove={handleRemoveDish}
            primaryActionLabel={isOnboarding ? "Sačuvaj i nastavi" : "Sačuvaj"}
            showGenerateAction
          />
        </div>

        <div className="order-1 lg:order-2">
          <DishCatalog
            wishlistKeysBySlot={wishlistKeysBySlot}
            onAdd={handleAddDish}
            preferPosno={preferPosno && !forceNonPosno}
          />
        </div>
      </div>

      {isOnboarding ? (
        <div className="mt-4 text-center">
          <button
            className="text-sm font-semibold text-black/45 transition-colors hover:text-[#5055D2] hover:underline"
            onClick={() => void handleSkipOnboarding()}
            type="button"
          >
            Preskoči ovaj korak
          </button>
        </div>
      ) : null}
    </>
  );
}
