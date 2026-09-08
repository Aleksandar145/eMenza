"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AiRecommendationMenuList } from "@/components/ai-preporuka/AiRecommendationMenuList";
import type { AiRecommendation } from "@/lib/ai-preporuka-mock";
import { mealSlotLabels, generateDishRecommendation } from "@/lib/ai-preporuka-mock";
import { getKreatorObrokaHref } from "@/lib/kreator-obroka-mock";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { shouldPreferPosnoMeals } from "@/lib/fasting-preferences";
import { loadDishWishlist } from "@/lib/dish-wishlist-store";
import type { CreatorSlotPicks, MealOption } from "@/lib/kreator-obroka-mock";

const AI_PICKS_STORAGE_KEY = "emza-ai-picks";

type AiRecommendationCardProps = {
  recommendation: AiRecommendation;
  dateKey: string;
};

export function AiRecommendationCard({
  recommendation,
  dateKey,
}: AiRecommendationCardProps) {
  const router = useRouter();
  const { settings } = useUserSettings();
  const { snapshot } = useCardAccess();

  const preferPosno = shouldPreferPosnoMeals(
    settings.profile.religion,
    dateKey,
    settings.fasting,
  );

  const [forceNonPosno, setForceNonPosno] = useState(false);
  const isFasting = preferPosno;

  const mealMeta = mealSlotLabels[recommendation.suggestedObrok];

  function handlePlati() {
    const rec = forceNonPosno
      ? generateDishRecommendation({
          wishlist: loadDishWishlist(),
          obrok: recommendation.suggestedObrok,
          dateKey,
          balanceRsd: snapshot?.balanceRsd ?? 500,
          preferPosno: false,
          forceNonPosno: true,
        })
      : recommendation;

    const dishIds = rec?.selectedDishIds;
    if (!dishIds) {
      router.push(getKreatorObrokaHref({
        dateKey,
        obrok: recommendation.suggestedObrok,
      }));
      return;
    }

    const picks: CreatorSlotPicks = { main: [], side: [], salad: [], dessert: [] };
    for (const [slotId, dishId] of Object.entries(dishIds)) {
      if (!dishId) continue;
      picks[slotId as keyof CreatorSlotPicks] = [{ id: dishId }] as MealOption[];
    }

    localStorage.setItem(AI_PICKS_STORAGE_KEY, JSON.stringify(picks));
    router.push(getKreatorObrokaHref({
      dateKey,
      obrok: recommendation.suggestedObrok,
    }) + "&preselect=1");
  }

  return (
    <article className="overflow-hidden rounded-[20px] border border-[#5055D2]/20 bg-white shadow-[0_2px_16px_rgba(80,85,210,0.08)]">
      <div className="flex items-center gap-2 border-b border-black/5 px-5 py-3">
        <Sparkles aria-hidden="true" className="text-[#5055D2]" size={16} />
        <h3 className="text-sm font-bold text-black">AI preporuka</h3>
        <span
          className="ml-auto inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: mealMeta.color }}
        >
          {mealMeta.label}
        </span>
      </div>

      <div className="flex gap-4 p-5">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#EFF1F4]">
          <Image
            alt={recommendation.mealName}
            className="object-cover"
            fill
            sizes="80px"
            src={recommendation.image}
            unoptimized
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-snug text-black">
            {recommendation.composedMenu.glavno_jelo ?? recommendation.mealName}
          </p>
        </div>
      </div>

      <AiRecommendationMenuList className="mx-5 mb-5" recommendation={recommendation} />

      <div className="flex flex-col gap-2 border-t border-black/5 bg-[#EFF1F4]/40 px-5 py-4">
        {isFasting && !forceNonPosno ? (
          <button
            className="inline-flex w-full items-center justify-center rounded-full border border-[#2f8f55] py-2.5 text-sm font-semibold text-[#2f8f55] transition-colors hover:bg-[#2f8f55]/5"
            onClick={() => setForceNonPosno(true)}
            type="button"
          >
            Generiši hranu koja nije posna
          </button>
        ) : null}
        <div className="flex gap-2">
          <button
            className="inline-flex flex-1 items-center justify-center rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            onClick={handlePlati}
            style={{
              backgroundImage: "linear-gradient(83deg, #5055D2 26%, #9093E1 100%)",
            }}
            type="button"
          >
            Plati
          </button>
          <button
            className="inline-flex flex-1 items-center justify-center rounded-full border border-[#5055D2] bg-white py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5"
            onClick={() =>
              router.push(getKreatorObrokaHref({
                dateKey,
                obrok: recommendation.suggestedObrok,
              }))
            }
            type="button"
          >
            Kreiraj sam
          </button>
        </div>
      </div>
    </article>
  );
}
