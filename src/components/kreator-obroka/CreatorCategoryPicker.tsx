"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Copy, Plus, RotateCcw } from "lucide-react";
import {
  calculateSlotPicksTotal,
  canAffordDuplicatePick,
  countMealInPicks,
  creatorSlotLabels,
  duplicateFirstSlotPick,
  formatMealDisabledLabel,
  resolveMealDisabledState,
  type CreatorSlotId,
  type MealOption,
} from "@/lib/kreator-obroka-mock";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { CreatorSlotEmptyState } from "@/components/kreator-obroka/CreatorSlotEmptyState";
import { getCustomBadgeDefs } from "@/lib/custom-badges-store";

type CreatorCategoryPickerProps = {
  slotId: CreatorSlotId;
  picks: MealOption[];
  options: MealOption[];
  balanceRsd: number;
  otherSlotsTotal: number;
  onChange: (picks: MealOption[]) => void;
  onPreviewMeal?: (meal: MealOption) => void;
  onSkip?: () => void;
  dateLabel?: string;
};

function formatSelectionSummary(picks: MealOption[]) {
  if (picks.length === 1) {
    return picks[0].name;
  }

  if (picks[0].name === picks[1].name) {
    return `${picks[0].name} ×2`;
  }

  return `${picks[0].name} + ${picks[1].name}`;
}

function statusHint(picks: MealOption[], choosingSecond: boolean) {
  if (picks.length === 0) {
    return "Tapnite jelo koje želite.";
  }

  if (choosingSecond) {
    return "Izaberite drugo jelo — isto ili drugačije.";
  }

  if (picks.length === 2) {
    return "Imate 2 jela u ovoj kategoriji.";
  }

  return "Samo ovo, duplo isto ili još jedno jelo.";
}

export function CreatorCategoryPicker({
  slotId,
  picks,
  options,
  balanceRsd,
  otherSlotsTotal,
  onChange,
  onPreviewMeal,
  onSkip,
  dateLabel = "",
}: CreatorCategoryPickerProps) {
  const slotLabel = creatorSlotLabels[slotId];
  const picksTotal = calculateSlotPicksTotal(picks);
  const [choosingSecond, setChoosingSecond] = useState(false);
  const customBadgeDefs = getCustomBadgeDefs();

  if (options.length === 0) {
    return (
      <CreatorSlotEmptyState
        className="flex-1"
        compact
        dateLabel={dateLabel || "izabrani dan"}
        slotId={slotId}
      />
    );
  }

  function selectFirst(meal: MealOption) {
    onChange([meal]);
    onPreviewMeal?.(meal);
    setChoosingSecond(false);
  }

  function selectSecond(meal: MealOption) {
    if (picks.length !== 1) {
      return;
    }

    onChange([picks[0], meal]);
    onPreviewMeal?.(meal);
    setChoosingSecond(false);
  }

  function handleMealClick(meal: MealOption) {
    const { disabled } = resolveMealDisabledState({
      meal,
      balanceRsd,
      otherSlotsTotal,
      existingPicks: picks,
      choosingSecond,
    });

    if (disabled) {
      return;
    }

    if (picks.length === 0) {
      selectFirst(meal);
      return;
    }

    if (choosingSecond && picks.length === 1) {
      selectSecond(meal);
      return;
    }

    if (picks.length === 1) {
      selectFirst(meal);
      return;
    }

    onPreviewMeal?.(meal);
  }

  function handleDoubleSame() {
    if (picks.length >= 1 && canAffordDuplicatePick({ balanceRsd, otherSlotsTotal, pick: picks[0] })) {
      onChange(duplicateFirstSlotPick(picks.length === 1 ? picks : [picks[0]]));
      setChoosingSecond(false);
    }
  }

  function handleReset() {
    onChange([]);
    setChoosingSecond(false);
  }

  function handleBackToOne() {
    if (picks.length > 0) {
      onChange([picks[0]]);
    }
    setChoosingSecond(false);
  }

  function handleSkipCategory() {
    onChange([]);
    setChoosingSecond(false);
    onSkip?.();
  }

  const showQuantityActions = picks.length === 1 && !choosingSecond;
  const showSecondPickHint = picks.length === 1 && choosingSecond;
  const showCompleteActions = picks.length === 2;
  const canDuplicatePick =
    picks.length === 1 &&
    canAffordDuplicatePick({ balanceRsd, otherSlotsTotal, pick: picks[0] });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-black/5 px-4 py-3 lg:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-black lg:text-base">
              Izaberite {slotLabel.toLowerCase()}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs font-light text-black/55">
              {statusHint(picks, choosingSecond)}
            </p>
          </div>
          {picks.length > 0 ? (
            <span className="shrink-0 rounded-full bg-[#5055D2]/10 px-2.5 py-1 text-xs font-bold tabular-nums text-[#5055D2]">
              {picksTotal} RSD
            </span>
          ) : null}
        </div>

        {showQuantityActions ? (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 truncate text-xs font-semibold text-black">{picks[0].name}</span>
              <button
                className="inline-flex items-center gap-1 rounded-full border-2 border-[#5055D2] bg-[#5055D2] px-3 py-1.5 text-[11px] font-bold text-white"
                type="button"
              >
                <Check aria-hidden="true" size={12} />
                Samo ovo
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-[#5055D2]/30 bg-white px-3 py-1.5 text-[11px] font-bold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canDuplicatePick}
                onClick={handleDoubleSame}
                type="button"
              >
                <Copy aria-hidden="true" size={12} />
                Duplo
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-[#5055D2]/30 bg-white px-3 py-1.5 text-[11px] font-bold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10"
                onClick={() => setChoosingSecond(true)}
                type="button"
              >
                <Plus aria-hidden="true" size={12} />
                Drugo jelo
              </button>
            </div>
            <button
              className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-black/55 transition-colors hover:border-[#5055D2]/30 hover:text-[#5055D2]"
              onClick={handleSkipCategory}
              type="button"
            >
              Preskoči
            </button>
          </div>
        ) : null}

        {showSecondPickHint ? (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-black/65">
              Prvo: <span className="font-bold text-black">{picks[0].name}</span>
            </p>
            <button
              className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-black/55 transition-colors hover:border-[#5055D2]/30 hover:text-[#5055D2]"
              onClick={() => setChoosingSecond(false)}
              type="button"
            >
              Nazad
            </button>
          </div>
        ) : null}

        {showCompleteActions ? (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-xs font-bold text-black">{formatSelectionSummary(picks)}</p>
            <div className="flex shrink-0 gap-1.5">
              <button
                className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-black/65 transition-colors hover:border-[#5055D2]/30 hover:text-[#5055D2]"
                onClick={handleBackToOne}
                type="button"
              >
                Samo jedno
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-black/65 transition-colors hover:border-[#5055D2]/30 hover:text-[#5055D2]"
                onClick={handleReset}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={11} />
                Promeni
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 items-stretch px-4 py-3 lg:px-6 lg:py-4">
        <div className="grid h-full min-h-0 w-full grid-cols-3 gap-2 sm:gap-3">
          {options.map((meal) => {
            const inPicksCount = countMealInPicks(picks, meal);
            const isSelected = inPicksCount > 0;
            const isPrimaryOnly = picks.length === 1 && picks[0].name === meal.name && !choosingSecond;
            const { disabled: mealDisabled, reason: disabledReason } = resolveMealDisabledState({
              meal,
              balanceRsd,
              otherSlotsTotal,
              existingPicks: picks,
              choosingSecond,
            });

            return (
              <button
                className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border text-left transition-all sm:rounded-2xl ${
                  isSelected
                    ? "border-[#5055D2] bg-[#5055D2]/[0.04] ring-2 ring-[#5055D2]/15"
                    : choosingSecond
                      ? "border-black/5 bg-white hover:border-[#5055D2]/25"
                      : "border-black/5 bg-[#EFF1F4]/60 hover:border-[#5055D2]/25"
                } ${mealDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                disabled={mealDisabled || (picks.length === 2 && !choosingSecond)}
                key={meal.name}
                onClick={() => handleMealClick(meal)}
                type="button"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <Image
                    alt={meal.name}
                    className={`object-cover ${mealDisabled ? "grayscale" : ""}`}
                    fill
                    sizes="(max-width: 768px) 30vw, 200px"
                    src={meal.image}
                  />
                  <div
                    className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 sm:left-2 sm:top-2 sm:px-2 sm:py-1 ${
                      isSelected ? "bg-[#5055D2] text-white" : "bg-white/95 text-[#5055D2]"
                    }`}
                  >
                    <span className="text-xs font-extrabold tabular-nums leading-none sm:text-sm">
                      {meal.price}
                    </span>
                    <span className="ml-0.5 text-[8px] font-semibold uppercase opacity-80 sm:text-[9px]">
                      din
                    </span>
                  </div>
                  {isSelected ? (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#5055D2] px-1.5 py-0.5 text-[9px] font-bold text-white sm:right-2 sm:top-2 sm:px-2 sm:text-[10px]">
                      <Check aria-hidden="true" size={9} />
                      {inPicksCount}×
                    </span>
                  ) : choosingSecond ? (
                    <span className="absolute right-1.5 top-1.5 rounded-full border border-white/80 bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-[#5055D2] sm:right-2 sm:top-2 sm:px-2 sm:text-[10px]">
                      Dodaj
                    </span>
                  ) : mealDisabled && disabledReason ? (
                    <span
                      className={`absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-white sm:right-2 sm:top-2 sm:px-2 sm:text-[10px] ${
                        disabledReason === "soldOut"
                          ? "bg-red-600 uppercase tracking-wide"
                          : "bg-amber-600"
                      }`}
                    >
                      {formatMealDisabledLabel(disabledReason, "badge")}
                    </span>
                  ) : null}
                </div>

                <div className="shrink-0 space-y-0.5 p-2 sm:p-2.5">
                  <h3 className="truncate text-[11px] font-bold text-black sm:text-xs lg:text-sm">
                    {meal.name}
                  </h3>
                  <p
                    className={`truncate text-[10px] font-medium ${
                      isPrimaryOnly ? "text-[#5055D2]" : "text-black/45"
                    }`}
                  >
                    {meal.stock > 0 ? (
                      <span className="text-black/45">{meal.stock} preostalo · </span>
                    ) : null}
                    <DishBadgeList badges={meal.badges} customDefs={customBadgeDefs} limit={2} />
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CreatorCategoryPicker;
