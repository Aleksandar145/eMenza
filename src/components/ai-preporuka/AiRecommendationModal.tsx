"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { AiRecommendationMenuList } from "@/components/ai-preporuka/AiRecommendationMenuList";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import {
  getAiPreporukaHref,
  mealSlotLabels,
  generateDishRecommendation,
  type AiRecommendation,
} from "@/lib/ai-preporuka-mock";
import { getKreatorObrokaHref } from "@/lib/kreator-obroka-mock";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { shouldPreferPosnoMeals } from "@/lib/fasting-preferences";
import { loadDishWishlist } from "@/lib/dish-wishlist-store";
import type { CreatorSlotPicks, MealOption } from "@/lib/kreator-obroka-mock";

const AI_PICKS_STORAGE_KEY = "emza-ai-picks";

type AiRecommendationModalProps = {
  isOpen: boolean;
  recommendation: AiRecommendation | null;
  dateKey: string;
  onClose: () => void;
  onRefreshRecommendation?: (rec: AiRecommendation) => void;
};

export function AiRecommendationModal({
  isOpen,
  recommendation,
  dateKey,
  onClose,
  onRefreshRecommendation,
}: AiRecommendationModalProps) {
  const router = useRouter();
  const { settings } = useUserSettings();
  const { snapshot } = useCardAccess();

  const preferPosno = shouldPreferPosnoMeals(
    settings.profile.religion,
    dateKey,
    settings.fasting,
  );

  const [forceNonPosno, setForceNonPosno] = useState(false);
  const [currentMainIndex, setCurrentMainIndex] = useState(0);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  const mainRankings = useMemo(() => loadDishWishlist().main ?? [], []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentMainIndex(0);
      queueMicrotask(() => setForceNonPosno(false));
    }
  }, [isOpen]);

  const activeRec = useMemo(() => {
    if (!recommendation) return null;

    if (currentMainIndex !== 0 || (forceNonPosno && preferPosno)) {
      const wishlist = loadDishWishlist();
      return generateDishRecommendation({
        wishlist,
        obrok: recommendation.suggestedObrok,
        dateKey,
        balanceRsd: snapshot?.balanceRsd ?? 500,
        preferPosno: preferPosno && !forceNonPosno,
        forceNonPosno,
        mainDishSkipCount: currentMainIndex,
      }) ?? recommendation;
    }

    return recommendation;
  }, [forceNonPosno, preferPosno, recommendation, dateKey, snapshot?.balanceRsd, currentMainIndex]);

  function handleTogglePosno() {
    const next = !forceNonPosno;
    setForceNonPosno(next);
    if (next && onRefreshRecommendation && recommendation) {
      const wishlist = loadDishWishlist();
      const rec = generateDishRecommendation({
        wishlist,
        obrok: recommendation.suggestedObrok,
        dateKey,
        balanceRsd: snapshot?.balanceRsd ?? 500,
        preferPosno: false,
        forceNonPosno: true,
        mainDishSkipCount: currentMainIndex,
      });
      if (rec) onRefreshRecommendation(rec);
    }
  }

  function handlePrevDish() {
    if (currentMainIndex > 0) setCurrentMainIndex((p) => p - 1);
  }

  function handleNextDish() {
    if (currentMainIndex < mainRankings.length - 1) setCurrentMainIndex((p) => p + 1);
  }

  function handlePlati() {
    if (!activeRec?.selectedDishIds) return;

    const picks: CreatorSlotPicks = { main: [], side: [], salad: [], dessert: [] };
    for (const [slotId, dishId] of Object.entries(activeRec.selectedDishIds)) {
      if (!dishId) continue;
      picks[slotId as keyof CreatorSlotPicks] = [{ id: dishId }] as MealOption[];
    }

    localStorage.setItem(AI_PICKS_STORAGE_KEY, JSON.stringify(picks));
    const href = getKreatorObrokaHref({
      dateKey,
      obrok: activeRec.suggestedObrok,
    }) + "&preselect=1";

    onClose();
    router.push(href);
  }

  if (!isOpen || !activeRec) return null;

  const mealMeta = mealSlotLabels[activeRec.suggestedObrok];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Zatvori"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />

      <section
        aria-labelledby="ai-recommendation-modal-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="text-[#5055D2]" size={18} />
            <h2 className="text-base font-bold text-black" id="ai-recommendation-modal-title">
              AI preporuka
            </h2>
          </div>
          <button
            aria-label="Zatvori"
            className="flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#EFF1F4] hover:text-black"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <MealBookingLockedSection>
          <div className="px-5 py-5">
            <div className="flex gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#EFF1F4]">
                <Image
                  alt={activeRec.mealName}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={activeRec.image}
                  unoptimized
                />
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: mealMeta.color }}
                >
                  {mealMeta.label}
                </span>
                <div className="mt-1 flex items-center gap-0.5">
                  {mainRankings.length > 1 && currentMainIndex > 0 ? (
                    <button
                      aria-label="Prethodno jelo"
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#EFF1F4] hover:text-black"
                      onClick={handlePrevDish}
                      type="button"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  ) : <div className="size-6 shrink-0" />}
                  <p className="flex-1 text-lg font-bold leading-snug text-black">
                    {activeRec.composedMenu.glavno_jelo ?? activeRec.mealName}
                  </p>
                  {mainRankings.length > 1 && currentMainIndex < mainRankings.length - 1 ? (
                    <button
                      aria-label="Sledeće jelo"
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#EFF1F4] hover:text-black"
                      onClick={handleNextDish}
                      type="button"
                    >
                      <ChevronRight size={16} />
                    </button>
                  ) : <div className="size-6 shrink-0" />}
                </div>
                <p className="mt-2 text-xs font-medium text-black/60">
                  {activeRec.reason}
                </p>
              </div>
            </div>

            <AiRecommendationMenuList className="mt-5" recommendation={activeRec} />
          </div>

          <div className="space-y-3 border-t border-black/5 px-5 py-4">
            {preferPosno && !forceNonPosno ? (
              <button
                className="flex w-full items-center justify-center rounded-full border border-[#2f8f55] py-2.5 text-sm font-semibold text-[#2f8f55] transition-colors hover:bg-[#2f8f55]/5"
                onClick={handleTogglePosno}
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
              <Link
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[#5055D2] py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5"
                href={getKreatorObrokaHref({
                  dateKey,
                  obrok: activeRec.suggestedObrok,
                })}
                onClick={onClose}
              >
                Kreiraj sam
              </Link>
            </div>
            <Link
              className="block text-center text-xs font-semibold text-black/45 transition-colors hover:text-[#5055D2]"
              href={getAiPreporukaHref()}
              onClick={onClose}
            >
              Prilagodi listu
            </Link>
          </div>
        </MealBookingLockedSection>
      </section>
    </div>
  );
}

export default AiRecommendationModal;
