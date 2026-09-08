"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Leaf,
  Receipt,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/components/shared/toast/useToast";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { CreatorBalanceHint } from "@/components/kreator-obroka/CreatorBalanceHint";
import { getCustomBadgeDefs } from "@/lib/custom-badges-store";
import { CreatorCategoryPicker } from "@/components/kreator-obroka/CreatorCategoryPicker";
import { CreatorSlotEmptyState } from "@/components/kreator-obroka/CreatorSlotEmptyState";
import { KreatorObrokaReviewStep } from "@/components/kreator-obroka/KreatorObrokaReviewStep";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import { ReservationBookByCountdown } from "@/components/shared/ReservationBookByCountdown";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { adjustStudentCardBalance } from "@/lib/referent-cards-store";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useMealReservations } from "@/hooks/useMealReservations";
import { usePublishedMenu } from "@/hooks/usePublishedMenu";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  calendarTodayDateKey,
  clampToAvailableReservationDay,
  createMealReservation,
  formatCalendarDayLabel,
  getMealDetailsForDay,
  type MealPickupMode,
  type MealType,
} from "@/lib/dashboard-mock";
import {
  createReservationViaApi,
  shouldUseReservationsApi,
} from "@/lib/backend/reservations-api";
import { ApiError } from "@/lib/api/client";
import {
  canBookMealSlot,
  getFirstBookableMealType,
  getNoBookableMealsReason,
} from "@/lib/meal-booking-window";
import { buildMealDetailsForDay } from "@/lib/reservations-view";
import { shouldOfferIftarTakeaway } from "@/lib/fasting-preferences";
import {
  calculateCreatorTotalFromPicks,
  calculateOtherSlotsTotal,
  calculateSlotPicksTotal,
  canSkipCreatorSlot,
  creatorSlotOrder,
  formatMealDisabledLabel,
  getDefaultSlotPicksFromOptions,
  hasSelectableMealOptions,
  parseKreatorObrokaObrok,
  resolveMealDisabledState,
  slotPicksToDishIds,
  slotPicksToMealDetails,
  formatPicksSummary,
  type CreatorSlotId,
  type CreatorSlotPicks,
  type MealOption,
} from "@/lib/kreator-obroka-mock";

type CreatorStep = {
  id: string;
  label: string;
  icon: typeof Utensils;
  prompt: string;
  slotId?: CreatorSlotId;
};

const creatorSteps: CreatorStep[] = [
  {
    id: "main",
    label: "Glavno jelo",
    icon: Utensils,
    prompt: "Izaberite glavno jelo",
    slotId: "main",
  },
  {
    id: "side",
    label: "Dodatak",
    icon: UtensilsCrossed,
    prompt: "Izaberite dodatak",
    slotId: "side",
  },
  { id: "salad", label: "Salata", icon: Leaf, prompt: "Izaberite salatu", slotId: "salad" },
  { id: "dessert", label: "Dezert", icon: Cookie, prompt: "Izaberite dezert", slotId: "dessert" },
  { id: "review", label: "Pregled", icon: Receipt, prompt: "Pregled i plaćanje" },
];

const mealSlotOptions: { type: MealType; label: string; short: string; color: string }[] = [
  { type: "breakfast", label: "Doručak", short: "D", color: "var(--meal-breakfast)" },
  { type: "lunch", label: "Ručak", short: "R", color: "var(--meal-lunch)" },
  { type: "dinner", label: "Večera", short: "V", color: "var(--meal-dinner)" },
];

function parseDateParam(value: string | null, legacyDay: string | null) {
  if (value) {
    return clampToAvailableReservationDay(value);
  }

  const parsedDay = Number(legacyDay);
  if (Number.isFinite(parsedDay) && parsedDay > 0) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return clampToAvailableReservationDay(`${year}-${month}-${String(parsedDay).padStart(2, "0")}`);
  }

  return calendarTodayDateKey;
}

function findNextNonEmptyStep(
  fromStep: number,
  optionsBySlot: Record<CreatorSlotId, MealOption[]>,
): number {
  let next = fromStep + 1;

  while (next < creatorSteps.length - 1) {
    const slotId = creatorSteps[next]?.slotId;
    if (!slotId || optionsBySlot[slotId].length > 0) {
      return next;
    }
    next += 1;
  }

  return creatorSteps.length - 1;
}

export function KreatorObrokaPage() {
  useAdminSystem();
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { settings } = useUserSettings();
  const { guardAction, cardState, snapshot } = useCardAccess();
  const { reservations, usesBackend, refresh } = useMealReservations();
  const balanceRsd = cardState === "loading" ? Number.POSITIVE_INFINITY : snapshot.balanceRsd;

  const initialDateKey = parseDateParam(searchParams.get("datum"), searchParams.get("dan"));
  const initialObrok = parseKreatorObrokaObrok(searchParams.get("obrok")) ?? "lunch";
  const hasPreselect = searchParams.get("preselect") === "1";

  const dayMealDetails = useMemo(() => {
    if (usesBackend) {
      return buildMealDetailsForDay(initialDateKey, reservations);
    }

    return getMealDetailsForDay(initialDateKey);
  }, [initialDateKey, reservations, usesBackend]);

  const visibleMealSlots = useMemo(
    () =>
      mealSlotOptions.filter((slot) => {
        const section = dayMealDetails.sections.find((entry) => entry.type === slot.type);
        if (!section) {
          return false;
        }

        return canBookMealSlot(initialDateKey, slot.type, section.status);
      }),
    [dayMealDetails.sections, initialDateKey],
  );

  const noBookableMeals = visibleMealSlots.length === 0;
  const noBookableMealsReason = noBookableMeals
    ? getNoBookableMealsReason(initialDateKey, dayMealDetails.sections)
    : null;

  const [slotPicks, setSlotPicks] = useState<CreatorSlotPicks>(() => ({
    main: [],
    side: [],
    salad: [],
    dessert: [],
  }));
  const [activeStep, setActiveStep] = useState(0);
  const customBadgeDefs = getCustomBadgeDefs();
  const [mealSlot, setMealSlot] = useState<MealType>(initialObrok);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [reservationDateKey] = useState(initialDateKey);
  const [pickupMode, setPickupMode] = useState<MealPickupMode>("u_menzi");
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);

  useEffect(() => {
    if (noBookableMeals) {
      return;
    }

    const currentSection = dayMealDetails.sections.find((entry) => entry.type === mealSlot);
    const isCurrentBookable =
      currentSection &&
      canBookMealSlot(initialDateKey, mealSlot, currentSection.status);

    if (isCurrentBookable) {
      return;
    }

    const nextMealSlot = getFirstBookableMealType(initialDateKey, dayMealDetails.sections);
    if (nextMealSlot && nextMealSlot !== mealSlot) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMealSlot(nextMealSlot);
      setActiveStep(0);
      setPreviewIndex(0);
    }
  }, [dayMealDetails.sections, initialDateKey, mealSlot, noBookableMeals]);

  const {
    isReady: menuReady,
    menuAvailable,
    isEmpty: menuEmpty,
    optionsBySlot,
  } = usePublishedMenu(reservationDateKey, mealSlot);

  useEffect(() => {
    if (!menuReady) {
      return;
    }

    if (hasPreselect) {
      queueMicrotask(() => {
        try {
          const raw = localStorage.getItem("emza-ai-picks");
          if (raw) {
            const saved: CreatorSlotPicks = JSON.parse(raw);
            const picks: CreatorSlotPicks = { main: [], side: [], salad: [], dessert: [] };

            for (const slotId of creatorSlotOrder) {
              const savedMeals = saved[slotId] ?? [];
              const menuMeals = optionsBySlot[slotId] ?? [];
              for (const savedMeal of savedMeals) {
                const match = menuMeals.find((m) => m.id === savedMeal.id);
                if (match) picks[slotId].push(match);
              }
            }

            setSlotPicks(picks);
            setActiveStep(creatorSteps.length - 1);
            localStorage.removeItem("emza-ai-picks");
          }
        } catch {
          /* fallback to default */
        }
      });
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlotPicks(getDefaultSlotPicksFromOptions(optionsBySlot, balanceRsd));
    setActiveStep(0);
    setPreviewIndex(0);
  }, [balanceRsd, hasPreselect, menuReady, optionsBySlot]);

  function handleMealSlotChange(nextMealSlot: MealType) {
    setMealSlot(nextMealSlot);
    setActiveStep(0);
    setPreviewIndex(0);
  }

  const showPickupModePicker = shouldOfferIftarTakeaway(
    settings.profile.religion,
    reservationDateKey,
    mealSlot,
    settings.fasting,
  );

  const currentStep = creatorSteps[activeStep];
  const isReviewStep = currentStep.id === "review";
  const currentSlotId = currentStep.slotId;
  const canPickMeals = menuReady && menuAvailable && !menuEmpty;
  const availableMeals = useMemo(
    () => (currentSlotId ? optionsBySlot[currentSlotId] : []),
    [currentSlotId, optionsBySlot],
  );
  const currentPicks = currentSlotId ? slotPicks[currentSlotId] : slotPicks.main;
  const otherSlotsTotal = currentSlotId
    ? calculateOtherSlotsTotal(slotPicks, currentSlotId)
    : calculateCreatorTotalFromPicks(slotPicks);
  const selectedMeal = currentPicks[0] ?? availableMeals[0];
  const previewMeal = availableMeals[previewIndex] ?? selectedMeal ?? availableMeals[0];
  const previewMealState = previewMeal
    ? resolveMealDisabledState({
        meal: previewMeal,
        balanceRsd,
        otherSlotsTotal,
        existingPicks: currentPicks,
        choosingSecond: false,
      })
    : { disabled: false as const };
  const reservationDate = formatCalendarDayLabel(reservationDateKey);
  const orderTotal = calculateCreatorTotalFromPicks(slotPicks);
  const remainingRsd = Math.max(0, balanceRsd - orderTotal);
  const currentStepTotal = currentSlotId ? calculateSlotPicksTotal(slotPicks[currentSlotId]) : 0;
  const currentSlotEmpty = Boolean(currentSlotId && availableMeals.length === 0);
  const currentSlotAllSoldOut = Boolean(
    currentSlotId &&
      availableMeals.length > 0 &&
      !hasSelectableMealOptions(availableMeals, balanceRsd, otherSlotsTotal),
  );
  const canAdvanceFromCurrentStep =
    !currentSlotId ||
    canSkipCreatorSlot(
      currentSlotId,
      availableMeals,
      slotPicks[currentSlotId],
      balanceRsd,
      otherSlotsTotal,
    );
  const showPickerAside = canPickMeals && Boolean(currentSlotId) && availableMeals.length > 0;

  function syncPreviewToSelection(slotId: CreatorSlotId) {
    const options = optionsBySlot[slotId];
    const firstPick = slotPicks[slotId][0];
    const selectedIndex = firstPick
      ? options.findIndex((meal) => meal.name === firstPick.name)
      : options.findIndex(
          (meal) => !resolveMealDisabledState({
            meal,
            balanceRsd,
            otherSlotsTotal: calculateOtherSlotsTotal(slotPicks, slotId),
            existingPicks: [],
            choosingSecond: false,
          }).disabled,
        );
    setPreviewIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }

  function advanceFromCurrentSlot() {
    if (activeStep >= creatorSteps.length - 1) {
      return;
    }

    setActiveStep((current) => {
      const nextStep = findNextNonEmptyStep(current, optionsBySlot);
      const nextSlotId = creatorSteps[nextStep]?.slotId;
      if (nextSlotId) {
        syncPreviewToSelection(nextSlotId);
      }
      return nextStep;
    });
  }

  function handleSlotPicksChange(slotId: CreatorSlotId, picks: MealOption[]) {
    setSlotPicks((current) => ({ ...current, [slotId]: picks }));
  }

  function handlePrevPreview() {
    setPreviewIndex((current) => (current === 0 ? availableMeals.length - 1 : current - 1));
  }

  function handleNextPreview() {
    setPreviewIndex((current) => (current === availableMeals.length - 1 ? 0 : current + 1));
  }

  function handlePrevStep() {
    if (activeStep === 0) {
      router.back();
      return;
    }
    setActiveStep((current) => {
      const nextStep = current - 1;
      const nextSlotId = creatorSteps[nextStep]?.slotId;
      if (nextSlotId) {
        syncPreviewToSelection(nextSlotId);
      }
      return nextStep;
    });
  }

  function handleNextStep() {
    if (isReviewStep) {
      guardAction(() => {
        void (async () => {
          setReservationError(null);
          setIsSubmittingReservation(true);

          try {
            const items = slotPicksToMealDetails(slotPicks);
            const totalRsd = calculateCreatorTotalFromPicks(slotPicks);

            if (shouldUseReservationsApi()) {
              await createReservationViaApi({
                dateKey: reservationDateKey,
                mealType: mealSlot,
                items,
                dishIds: slotPicksToDishIds(slotPicks),
                isPosno: items.isPosno,
                pickupMode: showPickupModePicker ? pickupMode : undefined,
                totalRsd,
              });
              await refresh();
            } else {
              const created = createMealReservation(reservationDateKey, mealSlot, items, {
                isPosno: items.isPosno,
                pickupMode: showPickupModePicker ? pickupMode : undefined,
                totalRsd,
                cardId: snapshot.cardId,
              });
              if (created && totalRsd > 0 && snapshot.cardId) {
                adjustStudentCardBalance(
                  snapshot.cardId,
                  -totalRsd,
                  `Rezervacija obroka — ${formatCalendarDayLabel(reservationDateKey)}`,
                );
              }
            }

            toast.success("Obrok uspešno rezervisan");
            router.push("/rezervacije");
          } catch (error) {
            const message =
              error instanceof ApiError ? error.message : "Rezervacija nije uspela.";
            setReservationError(message);
            toast.error(message);
          } finally {
            setIsSubmittingReservation(false);
          }
        })();
      });
      return;
    }

    if (currentSlotId && !canSkipCreatorSlot(
      currentSlotId,
      availableMeals,
      slotPicks[currentSlotId],
      balanceRsd,
      otherSlotsTotal,
    )) {
      return;
    }

    advanceFromCurrentSlot();
  }

  function syncPreviewForMeal(meal: MealOption) {
    const nextIndex = availableMeals.findIndex((item) => item.name === meal.name);
    if (nextIndex >= 0) {
      setPreviewIndex(nextIndex);
    }
  }

  function handleStepClick(index: number) {
    if (index <= activeStep || index === activeStep + 1) {
      setActiveStep(index);
      const slotId = creatorSteps[index]?.slotId;
      if (slotId) {
        syncPreviewToSelection(slotId);
      }
    }
  }

  const footerSummary = isReviewStep
    ? `Ukupno: ${orderTotal} RSD`
    : currentSlotId
      ? `Ukupno: ${orderTotal} RSD`
      : "";

  return (
    <AppLayout fillViewport>
      <section
        aria-labelledby="kreator-obroka-title"
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
      >
        <header className="shrink-0 border-b border-black/5 px-4 py-3 lg:px-6 lg:py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EFF1F4] text-black/55 transition-colors hover:text-[#5055D2]"
                href="/rezervacije"
              >
                <ArrowLeft aria-hidden="true" size={18} />
                <span className="sr-only">Nazad na rezervacije</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
                  <UtensilsCrossed aria-hidden="true" className="text-[#5055D2]" size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-black lg:text-2xl" id="kreator-obroka-title">
                    Kreator obroka
                  </h1>
                  <p className="text-sm font-light text-black/55">
                    Korak {activeStep + 1} od {creatorSteps.length} · {currentStep.prompt}
                  </p>
                  {!noBookableMeals ? (
                    <ReservationBookByCountdown
                      className="mt-1"
                      dateKey={reservationDateKey}
                      mealType={mealSlot}
                      status="nerezervisano"
                      variant="inline"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EFF1F4] px-3 py-2 text-sm font-semibold text-black">
                <CalendarDays aria-hidden="true" className="text-[#5055D2]" size={16} />
                {reservationDate}
              </div>
              <CreatorBalanceHint
                remainingRsd={remainingRsd}
                spentRsd={orderTotal}
                variant="header"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {visibleMealSlots.map((slot) => {
                const isActive = mealSlot === slot.type;

                return (
                  <button
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-transparent text-white shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                        : "border-black/8 bg-white text-black/65 hover:border-black/15"
                    }`}
                    key={slot.type}
                    onClick={() => handleMealSlotChange(slot.type)}
                    style={isActive ? { backgroundColor: slot.color } : undefined}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-5 items-center justify-center rounded-md text-[10px] font-bold text-white"
                      style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : slot.color }}
                    >
                      {slot.short}
                    </span>
                    {slot.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 lg:max-w-lg lg:flex-1 lg:justify-end">
              {creatorSteps.map((step, index) => {
                const isActive = index === activeStep;
                const isComplete = index < activeStep;
                const isClickable = index <= activeStep;

                return (
                  <div className="flex min-w-0 flex-1 items-center gap-1.5" key={step.id}>
                    <button
                      aria-current={isActive ? "step" : undefined}
                      aria-label={`${step.label}${isComplete ? ", završeno" : isActive ? ", trenutno" : ""}`}
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors lg:size-9 ${
                        isActive
                          ? "border-[#5055D2] bg-[#5055D2] text-white"
                          : isComplete
                            ? "border-[#5055D2]/30 bg-[#5055D2]/10 text-[#5055D2]"
                            : "border-black/10 bg-[#EFF1F4] text-black/35"
                      } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                      disabled={!isClickable}
                      onClick={() => handleStepClick(index)}
                      type="button"
                    >
                      {isComplete ? (
                        <Check aria-hidden="true" size={14} />
                      ) : (
                        <span className="text-[10px] font-bold lg:text-xs">{index + 1}</span>
                      )}
                    </button>
                    {index < creatorSteps.length - 1 ? (
                      <div
                        aria-hidden="true"
                        className={`h-0.5 min-w-[8px] flex-1 rounded-full ${
                          isComplete ? "bg-[#5055D2]/40" : "bg-black/10"
                        }`}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        <MealBookingLockedSection className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <aside
            className={`min-h-0 shrink-0 flex-col border-b border-black/5 bg-[#EFF1F4]/50 lg:flex lg:w-[34%] lg:border-b-0 lg:border-r xl:w-[36%] ${
              !noBookableMeals && (isReviewStep || showPickerAside) ? "flex" : "hidden"
            }`}
          >
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 py-4 lg:px-6 lg:py-5">
              {isReviewStep ? (
                <>
                  <div className="relative w-full max-w-[320px] flex-1">
                    <div className="relative flex h-full min-h-[160px] flex-col justify-end overflow-hidden rounded-[24px] border-4 border-white bg-gradient-to-br from-[#5055D2] to-[#9093E1] p-5 shadow-[0_8px_32px_rgba(80,85,210,0.15)]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                        Vaš obrok
                      </p>
                      <p className="mt-2 text-3xl font-extrabold tabular-nums text-white lg:text-4xl">
                        {orderTotal}{" "}
                        <span className="text-base font-semibold uppercase tracking-wide text-white/75">
                          RSD
                        </span>
                      </p>
                      <CreatorBalanceHint
                        className="mt-2"
                        remainingRsd={remainingRsd}
                        spentRsd={orderTotal}
                        variant="aside"
                      />
                      <ul className="mt-4 space-y-1.5 text-sm text-white/90">
                        {creatorSlotOrder.map((slotId) => {
                          const picks = slotPicks[slotId];

                          return (
                            <li className="flex justify-between gap-2" key={slotId}>
                              <span>{formatPicksSummary(picks)}</span>
                              <span className="font-semibold tabular-nums">
                                {picks.length > 0 ? `×${picks.length}` : "—"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                  <p className="max-w-[320px] text-center text-sm font-light text-black/55">
                    Proverite količine desno, zatim platite obrok.
                  </p>
                </>
              ) : currentSlotEmpty && currentSlotId ? (
                <CreatorSlotEmptyState dateLabel={reservationDate} slotId={currentSlotId} />
              ) : canPickMeals && previewMeal ? (
                <>
                  <div className="relative w-full max-w-[320px] flex-1">
                    <div className="relative h-full min-h-[160px] overflow-hidden rounded-[24px] border-4 border-white shadow-[0_8px_32px_rgba(80,85,210,0.15)]">
                      <Image
                        alt={previewMeal.name}
                        className={`object-cover ${previewMealState.disabled ? "grayscale" : ""}`}
                        fill
                        priority
                        sizes="320px"
                        src={previewMeal.image}
                        unoptimized
                      />
                      {previewMealState.disabled && previewMealState.reason ? (
                        <span
                          className={`absolute right-3 top-3 max-w-[min(100%,220px)] rounded-lg px-2.5 py-1 text-xs font-semibold leading-snug text-white ${
                            previewMealState.reason === "soldOut"
                              ? "bg-red-600 uppercase tracking-wide"
                              : "bg-amber-600"
                          }`}
                        >
                          {formatMealDisabledLabel(previewMealState.reason, "detail")}
                        </span>
                      ) : null}
                      <div
                        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-12 ${
                          previewMealState.disabled ? "opacity-60" : ""
                        }`}
                      >
                        <DishBadgeList
                          badges={previewMeal.badges}
                          className="[&_span]:bg-white/20 [&_span]:text-white [&_span]:backdrop-blur-sm"
                          customDefs={customBadgeDefs}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-[320px] text-center">
                    <p className="text-3xl font-extrabold tabular-nums text-[#5055D2] lg:text-4xl">
                      {currentStepTotal}{" "}
                      <span className="text-base font-semibold uppercase tracking-wide text-black/45 lg:text-lg">
                        din
                      </span>
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-black lg:text-2xl">{previewMeal.name}</h2>
                    <p className="mt-0.5 text-sm font-light text-black/55">{previewMeal.category}</p>
                    {currentPicks.length > 0 ? (
                      <p className="mt-2 text-xs font-medium text-black/55">
                        {formatPicksSummary(currentPicks)} · {currentPicks.length}/2
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      aria-label="Prethodno jelo"
                      className="flex size-9 items-center justify-center rounded-full border border-black/8 bg-white text-black/55 shadow-sm transition-colors hover:text-[#5055D2]"
                      onClick={handlePrevPreview}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" size={18} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {availableMeals.map((meal, index) => (
                        <span
                          className={`size-2 rounded-full transition-colors ${
                            index === previewIndex ? "bg-[#5055D2]" : "bg-black/15"
                          }`}
                          key={meal.name}
                        />
                      ))}
                    </div>
                    <button
                      aria-label="Sledeće jelo"
                      className="flex size-9 items-center justify-center rounded-full border border-black/8 bg-white text-black/55 shadow-sm transition-colors hover:text-[#5055D2]"
                      onClick={handleNextPreview}
                      type="button"
                    >
                      <ChevronRight aria-hidden="true" size={18} />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
            {noBookableMeals ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-lg font-bold text-black">
                  {noBookableMealsReason === "all_booked"
                    ? "Svi obroci za ovaj dan su već rezervisani"
                    : noBookableMealsReason === "outside_window"
                      ? "Datum nije u prozoru planiranja"
                      : "Nema dostupnih obroka za rezervaciju"}
                </p>
                <p className="mt-2 max-w-md text-sm text-black/55">
                  {noBookableMealsReason === "all_booked"
                    ? `Za ${reservationDate} već imate rezervisane sve dostupne obroke. Izaberite drugi dan na stranici rezervacija.`
                    : noBookableMealsReason === "outside_window"
                      ? `${reservationDate} nije dostupan za rezervaciju u trenutnom planerskom prozoru. Izaberite drugi dan na stranici rezervacija.`
                      : `Termin za rezervaciju svih obroka za ${reservationDate} je prošao (najkasnije 24h pre početka serviranja). Izaberite drugi dan na stranici rezervacija.`}
                </p>
                <Link
                  className="mt-6 rounded-full bg-[#5055D2] px-6 py-2.5 text-sm font-semibold text-white"
                  href="/rezervacije"
                >
                  Nazad na rezervacije
                </Link>
              </div>
            ) : !menuReady ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-lg font-bold text-black">Učitavam jelovnik…</p>
                <p className="mt-2 max-w-md text-sm text-black/55">
                  Priprema dostupnih jela za {reservationDate} (
                  {mealSlotOptions.find((option) => option.type === mealSlot)?.label.toLowerCase()}).
                </p>
              </div>
            ) : !menuAvailable ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-lg font-bold text-black">Jelovnik još nije objavljen</p>
                <p className="mt-2 max-w-md text-sm text-black/55">
                  Kuhinja nije objavila jelovnik za {reservationDate} ({mealSlotOptions.find((option) => option.type === mealSlot)?.label.toLowerCase()}).
                  Pokušajte kasnije ili izaberite drugi dan.
                </p>
                <Link
                  className="mt-6 rounded-full bg-[#5055D2] px-6 py-2.5 text-sm font-semibold text-white"
                  href="/rezervacije"
                >
                  Nazad na rezervacije
                </Link>
              </div>
            ) : menuEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-lg font-bold text-black">Nema dostupnih jela</p>
                <p className="mt-2 max-w-md text-sm text-black/55">
                  Za {reservationDate} (
                  {mealSlotOptions.find((option) => option.type === mealSlot)?.label.toLowerCase()}) trenutno
                  nema jela na jelovniku sa zalihama.
                </p>
                <Link
                  className="mt-6 rounded-full bg-[#5055D2] px-6 py-2.5 text-sm font-semibold text-white"
                  href="/rezervacije"
                >
                  Nazad na rezervacije
                </Link>
              </div>
            ) : isReviewStep ? (
              <KreatorObrokaReviewStep
                balanceRsd={balanceRsd}
                onPickupModeChange={setPickupMode}
                onSlotPicksChange={handleSlotPicksChange}
                optionsBySlot={optionsBySlot}
                pickupMode={pickupMode}
                showPickupModePicker={showPickupModePicker}
                slotPicks={slotPicks}
              />
            ) : currentSlotId && currentSlotEmpty ? (
              <CreatorSlotEmptyState
                className="flex-1"
                compact
                dateLabel={reservationDate}
                slotId={currentSlotId}
              />
            ) : currentSlotId ? (
              <CreatorCategoryPicker
                balanceRsd={balanceRsd}
                key={currentSlotId}
                dateLabel={reservationDate}
                onChange={(picks) => handleSlotPicksChange(currentSlotId, picks)}
                onPreviewMeal={syncPreviewForMeal}
                onSkip={advanceFromCurrentSlot}
                options={optionsBySlot[currentSlotId]}
                otherSlotsTotal={otherSlotsTotal}
                picks={slotPicks[currentSlotId]}
                slotId={currentSlotId}
              />
            ) : null}

            {isReviewStep && reservationError ? (
              <p className="mx-4 mb-0 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 lg:mx-6" role="alert">
                {reservationError}
              </p>
            ) : null}

            {!noBookableMeals ? (
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-black/5 bg-[#EFF1F4]/50 px-4 py-3 lg:px-6 lg:py-3.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">
                  {isReviewStep ? "Za plaćanje" : "Hrana"}
                </p>
                <p className="truncate text-sm font-bold text-black lg:text-base">{footerSummary}</p>
                <CreatorBalanceHint
                  className="mt-1"
                  remainingRsd={remainingRsd}
                  spentRsd={orderTotal}
                  variant="footer"
                />
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  className="rounded-full border-2 border-[#5055D2] bg-white px-6 py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5 lg:py-3 lg:text-base"
                  onClick={handlePrevStep}
                  type="button"
                >
                  {activeStep === 0 ? "Otkaži" : "Nazad"}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:py-3 lg:text-base"
                  disabled={
                    isSubmittingReservation ||
                    cardState === "loading" ||
                    !menuReady ||
                    !menuAvailable ||
                    menuEmpty ||
                    (isReviewStep && orderTotal <= 0) ||
                    (!isReviewStep && !canAdvanceFromCurrentStep)
                  }
                  onClick={handleNextStep}
                  style={{
                    backgroundImage: "linear-gradient(83deg, #5055D2 26%, #9093E1 100%)",
                  }}
                  type="button"
                >
                  {isReviewStep
                    ? isSubmittingReservation
                      ? "Rezervisanje…"
                      : "Plati"
                    : currentSlotEmpty || currentSlotAllSoldOut
                      ? "Preskoči"
                      : "Dalje"}
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>
            </footer>
            ) : null}
          </div>
        </div>
        </MealBookingLockedSection>
      </section>
    </AppLayout>
  );
}

export default KreatorObrokaPage;
