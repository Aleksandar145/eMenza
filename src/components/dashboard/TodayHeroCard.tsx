"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { ArrowRight, Clock, Leaf, Sparkles, UtensilsCrossed } from "lucide-react";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { getMealPickupWindow, type MealType } from "@/lib/dashboard-mock";
import {
  canBookMealSlot,
  canShowAiPreporuka,
  shouldShowBookingPassedMessage,
} from "@/lib/meal-booking-window";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useTodayMealView } from "@/hooks/useTodayMealView";
import { getPreuzimanjeHref } from "@/lib/preuzimanje-mock";
import { getRezervacijeHref } from "@/lib/rezervacije-mock";
import { useUserSettings } from "@/hooks/useUserSettings";
import { shouldShowPosnoMealsForDate, getLiturgicalDisplayInfo } from "@/lib/fasting-preferences";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import { CounterQueueBadge } from "@/components/shared/CounterQueueBadge";
import { ReservationBookByCountdown } from "@/components/shared/ReservationBookByCountdown";
import { getMealTypeLabel } from "@/i18n/catalog";
import { useT } from "@/i18n/useT";

type TodayHeroCardProps = {
  onReserve: (mealType: MealType) => void;
  onAiRecommend?: () => void;
  onViewDetails?: () => void;
};

export function TodayHeroCard({
  onReserve,
  onAiRecommend,
  onViewDetails,
}: TodayHeroCardProps) {
  const mounted = useClientMounted();
  const todayDateKey = useTodayDateKey();
  const { settings } = useUserSettings();
  const { language, t } = useT();
  const showPosnoMeals = useMemo(
    () =>
      shouldShowPosnoMealsForDate(
        settings.profile.religion,
        todayDateKey,
        settings.fasting,
      ),
    [settings.fasting, settings.profile.religion, todayDateKey],
  );
  const liturgicalLabel = useMemo(() => {
    if (!showPosnoMeals) {
      return null;
    }

    return getLiturgicalDisplayInfo(
      settings.profile.religion,
      todayDateKey,
      settings.fasting,
    ).label;
  }, [settings.fasting, settings.profile.religion, todayDateKey, showPosnoMeals]);
  const profile = useStudentProfile();
  const primary = useTodayMealView(todayDateKey);
  const { section, dateLabel, heroType } = primary;
  const mealLabel = getMealTypeLabel(language, section.type);
  const greetingName = profile.isIdentityLoaded
    ? profile.firstName || profile.displayName.split(/\s+/)[0] || profile.displayName
    : "";
  const pickupWindow = getMealPickupWindow(todayDateKey, section.type);
  const showPickupWindow =
    pickupWindow &&
    (heroType === "active" || heroType === "scheduled" || heroType === "unreserved");

  let statusText = t("dashboard.viewMealPlan");
  let cta: ReactNode = null;

  if (heroType === "active") {
    statusText = t("dashboard.mealReadyPickup", { meal: mealLabel });
    cta = (
      <Link
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5055D2] shadow-sm transition-opacity hover:opacity-90"
        href={getPreuzimanjeHref({ dateKey: todayDateKey, obrok: section.type })}
      >
        {t("dashboard.pickupAtCounter")}
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    );
  } else if (heroType === "scheduled") {
    statusText = section.items?.glavnoJelo
      ? t("dashboard.mealReserved", {
          meal: mealLabel,
          dish: section.items.glavnoJelo,
        })
      : t("dashboard.mealReservedNoDish", { meal: mealLabel });
    cta = (
      <button
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5055D2] shadow-sm transition-opacity hover:opacity-90"
        onClick={onViewDetails}
        type="button"
      >
        {t("dashboard.viewDetails")}
        <ArrowRight aria-hidden="true" size={16} />
      </button>
    );
  } else if (heroType === "unreserved") {
    if (canBookMealSlot(todayDateKey, section.type, section.status)) {
      const canShowAi = canShowAiPreporuka(todayDateKey, section.type) && Boolean(onAiRecommend);
      statusText = t("dashboard.notReservedYet", { meal: mealLabel, date: dateLabel });
      cta = (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5055D2] shadow-sm transition-opacity hover:opacity-90"
            onClick={() => onReserve(section.type)}
            type="button"
          >
            {t("dashboard.reserveMeal", { meal: mealLabel })}
            <ArrowRight aria-hidden="true" size={16} />
          </button>
          {canShowAi ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
              onClick={onAiRecommend}
              type="button"
            >
              <Sparkles aria-hidden="true" size={16} />
              {t("dashboard.aiRecommend")}
            </button>
          ) : null}
        </div>
      );
    } else if (shouldShowBookingPassedMessage(todayDateKey, section.type, section.status)) {
      statusText = t("meals.bookingPassed");
      cta = onViewDetails ? (
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
          onClick={onViewDetails}
          type="button"
        >
          {t("dashboard.viewDetails")}
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      ) : null;
    } else {
      statusText = t("dashboard.notReservedYet", { meal: mealLabel, date: dateLabel });
    }
  } else {
    statusText = t("dashboard.noNewActions");
    cta = (
      <button
        className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
        onClick={onViewDetails}
        type="button"
      >
        {t("dashboard.viewDetails")}
        <ArrowRight aria-hidden="true" size={16} />
      </button>
    );
  }

  const greeting = greetingName
    ? t("dashboard.greeting", { name: greetingName })
    : t("dashboard.greetingFallback");

  return (
    <section className="overflow-hidden rounded-[20px] bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#9093E1] shadow-[0_4px_24px_rgba(80,85,210,0.25)]">
      <div className="flex items-center gap-2 px-5 py-3 text-white/80 lg:px-6 lg:py-4">
        <UtensilsCrossed aria-hidden="true" size={18} />
        <span className="text-sm font-medium">
          {greeting} · {dateLabel}
        </span>
      </div>

      <MealBookingLockedSection className="rounded-none">
        <div className="p-5 pt-0 lg:p-6 lg:pt-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white lg:text-2xl">{t("dashboard.todayInCanteen")}</h2>
              <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-white/85 lg:text-base">
                {statusText}
              </p>
              {heroType === "unreserved" && canBookMealSlot(todayDateKey, section.type, section.status) ? (
                <ReservationBookByCountdown
                  className="mt-2"
                  dateKey={todayDateKey}
                  mealType={section.type}
                  status={section.status}
                  variant="hero"
                />
              ) : null}
              {showPickupWindow ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-white/90">
                  <Clock aria-hidden="true" size={15} />
                  {t("dashboard.pickupWindow", { window: pickupWindow })}
                </p>
              ) : null}
              <CounterQueueBadge dateKey={todayDateKey} mealType={section.type} variant="hero" />
              {mounted && liturgicalLabel ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  <Leaf aria-hidden="true" size={14} />
                  {liturgicalLabel}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {cta}
              {showPosnoMeals ? (
                <Link
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  href={getRezervacijeHref({ dateKey: todayDateKey, obrok: "lunch" })}
                >
                  {t("dashboard.reservePosno")}
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </MealBookingLockedSection>
    </section>
  );
}

export default TodayHeroCard;
