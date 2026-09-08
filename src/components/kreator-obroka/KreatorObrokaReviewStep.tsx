"use client";

import { MealPickupModePicker } from "@/components/shared/MealPickupModePicker";
import type { MealPickupMode } from "@/lib/dashboard-mock";
import {
  addSlotPick,
  calculateCreatorTotalFromPicks,
  calculateOtherSlotsTotal,
  calculateSlotPicksTotal,
  canAddPick,
  canAffordDuplicatePick,
  canAffordMealPick,
  countMealInPicks,
  creatorSlotLabels,
  creatorSlotOrder,
  duplicateFirstSlotPick,
  formatPicksSummary,
  isMealSoldOut,
  MAX_PICKS_PER_SLOT,
  removeSlotPickAt,
  type CreatorSlotId,
  type CreatorSlotPicks,
  type MealOption,
} from "@/lib/kreator-obroka-mock";

type KreatorObrokaReviewStepProps = {
  slotPicks: CreatorSlotPicks;
  balanceRsd: number;
  onSlotPicksChange: (slotId: CreatorSlotId, picks: MealOption[]) => void;
  optionsBySlot: Record<CreatorSlotId, MealOption[]>;
  showPickupModePicker?: boolean;
  pickupMode?: MealPickupMode;
  onPickupModeChange?: (mode: MealPickupMode) => void;
};

export function KreatorObrokaReviewStep({
  slotPicks,
  balanceRsd,
  onSlotPicksChange,
  optionsBySlot,
  showPickupModePicker = false,
  pickupMode = "u_menzi",
  onPickupModeChange,
}: KreatorObrokaReviewStepProps) {
  const total = calculateCreatorTotalFromPicks(slotPicks);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-black/5 px-5 py-4 lg:px-6">
        <h2 className="text-base font-bold text-black lg:text-lg">Pregled i plaćanje</h2>
        <p className="mt-0.5 text-sm font-light text-black/55">
          Do 2 jela po kategoriji — isto duplo ili dva različita. Izmenite pre plaćanja.
        </p>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-6 lg:py-5">
        <ul className="divide-y divide-black/5 rounded-2xl border border-black/5">
          {creatorSlotOrder.map((slotId) => {
            const picks = slotPicks[slotId];
            const lineTotal = calculateSlotPicksTotal(picks);
            const options = optionsBySlot[slotId];
            const otherSlotsTotal = calculateOtherSlotsTotal(slotPicks, slotId);
            const canDuplicate =
              picks.length === 1 &&
              canAffordDuplicatePick({ balanceRsd, otherSlotsTotal, pick: picks[0] });

            return (
              <li className="px-4 py-4" key={slotId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                      {creatorSlotLabels[slotId]}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-black">{formatPicksSummary(picks)}</p>
                    <p className="mt-1 text-xs font-light text-black/45">
                      {picks.map((pick) => `${pick.name} (${pick.price} RSD)`).join(" · ")}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-[#5055D2]">{lineTotal} RSD</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {picks.map((pick, index) => (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#5055D2]/25 bg-[#5055D2]/10 px-3 py-1 text-xs font-semibold text-[#5055D2]"
                      key={`${pick.name}-${index}`}
                    >
                      {index + 1}. {pick.name}
                      <button
                        aria-label={`Ukloni ${pick.name}`}
                        className="rounded-full px-1 text-[#5055D2]/70 hover:text-red-600"
                        onClick={() =>
                          onSlotPicksChange(slotId, removeSlotPickAt(picks, index))
                        }
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {canAddPick(picks) ? (
                  <div className="mt-3 rounded-xl border border-[#5055D2]/15 bg-[#5055D2]/5 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#5055D2]">
                        Dodaj jelo ({picks.length}/{MAX_PICKS_PER_SLOT})
                      </p>
                      {picks.length === 1 ? (
                        <button
                          className="rounded-full border border-[#5055D2]/30 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#5055D2] transition-colors hover:bg-[#5055D2]/10 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={!canDuplicate}
                          onClick={() => onSlotPicksChange(slotId, duplicateFirstSlotPick(picks))}
                          type="button"
                        >
                          Dupliraj prvo
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => {
                        const count = countMealInPicks(picks, option);
                        const canAdd =
                          canAddPick(picks) &&
                          !isMealSoldOut(option) &&
                          canAffordMealPick({
                            balanceRsd,
                            otherSlotsTotal,
                            existingPicks: picks,
                            meal: option,
                            choosingSecond: picks.length === 1,
                          });

                        return (
                          <button
                            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/65 transition-colors hover:border-[#5055D2]/30 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!canAdd}
                            key={option.name}
                            onClick={() => onSlotPicksChange(slotId, addSlotPick(picks, option))}
                            type="button"
                          >
                            {option.name} · {option.price} RSD
                            {count > 0 ? ` (${count}×)` : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}

          <li className="flex items-center justify-between gap-3 bg-[#EFF1F4]/60 px-4 py-4">
            <span className="text-sm font-semibold text-black">Ukupno</span>
            <span className="text-lg font-extrabold tabular-nums text-[#5055D2]">{total} RSD</span>
          </li>
        </ul>

        {showPickupModePicker && onPickupModeChange ? (
          <div className="mt-5 rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 p-4">
            <p className="mb-3 text-sm font-semibold text-[#5055D2]">Iftar večera</p>
            <MealPickupModePicker
              idPrefix="kreator-pickup"
              onChange={onPickupModeChange}
              value={pickupMode}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default KreatorObrokaReviewStep;
