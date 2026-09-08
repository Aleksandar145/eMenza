"use client";

import { ChevronDown, ChevronUp, Heart, Sparkles, Trash2 } from "lucide-react";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { creatorSlotLabels, creatorSlotOrder, type CreatorSlotId } from "@/lib/kreator-obroka-mock";
import { getDishById } from "@/lib/dish-catalog-store";
import type { DishWishlist } from "@/lib/dish-wishlist-store";

type DishRankingsTableProps = {
  wishlist: DishWishlist;
  onRemove: (slotId: CreatorSlotId, dishId: string) => void;
  onMove: (slotId: CreatorSlotId, dishId: string, direction: "up" | "down") => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  primaryActionLabel?: string;
  canProceed?: boolean;
  showGenerateAction?: boolean;
};

function SlotSection({
  slotId,
  dishIds,
  onRemove,
  onMove,
}: {
  slotId: CreatorSlotId;
  dishIds: string[];
  onRemove: (slotId: CreatorSlotId, dishId: string) => void;
  onMove: (slotId: CreatorSlotId, dishId: string, direction: "up" | "down") => void;
}) {
  return (
    <section className="border-b border-black/5 last:border-b-0">
      <div className="bg-[#EFF1F4]/70 px-5 py-2.5 lg:px-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-black/55">
          {creatorSlotLabels[slotId]}
        </h3>
      </div>

      {dishIds.length === 0 ? (
        <p className="px-5 py-4 text-xs font-light text-black/45 lg:px-6">
          Nema jela — dodajte sa desne strane.
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {dishIds.map((dishId, index) => {
            const dish = getDishById(dishId);
            if (!dish) return null;
            return (
              <li
                className={`flex items-center gap-2 px-4 py-3 lg:px-5 ${
                  index === 0 ? "bg-[#fff8e6]/60" : ""
                }`}
                key={dishId}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#5055D2]/10 text-xs font-bold text-[#5055D2]">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-black">{dish.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <DishBadgeList badges={dish.badges} size="sm" />
                    <span className="text-xs font-semibold tabular-nums text-[#5055D2]">
                      {dish.priceRsd} RSD
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    aria-label={`Pomeri ${dish.name} gore`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2] disabled:cursor-not-allowed disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => onMove(slotId, dishId, "up")}
                    type="button"
                  >
                    <ChevronUp aria-hidden="true" size={16} />
                  </button>
                  <button
                    aria-label={`Pomeri ${dish.name} dole`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2] disabled:cursor-not-allowed disabled:opacity-30"
                    disabled={index === dishIds.length - 1}
                    onClick={() => onMove(slotId, dishId, "down")}
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" size={16} />
                  </button>
                  <button
                    aria-label={`Ukloni ${dish.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-red-50 hover:text-red-600"
                    onClick={() => onRemove(slotId, dishId)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function DishRankingsTable({
  wishlist,
  onRemove,
  onMove,
  onGenerate,
  isGenerating = false,
  primaryActionLabel = "Sačuvaj listu želja",
  canProceed = true,
  showGenerateAction = false,
}: DishRankingsTableProps) {
  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="border-b border-black/5 px-5 py-4 lg:px-6 lg:py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
            <Heart aria-hidden="true" className="text-[#5055D2]" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black lg:text-2xl">Lista želja</h2>
            <p className="text-sm font-light text-black/55">
              Rangirajte jela po važnosti (↑↓). Prvo u listi je najbolji izbor.
            </p>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D1D5DB] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        {creatorSlotOrder.map((slotId) => {
          const dishIds = (wishlist[slotId] ?? []).map((r) => r.dishId);
          return (
            <SlotSection
              dishIds={dishIds}
              key={slotId}
              onMove={onMove}
              onRemove={onRemove}
              slotId={slotId}
            />
          );
        })}
        {creatorSlotOrder.every((slotId) => (wishlist[slotId]?.length ?? 0) === 0) ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#EFF1F4]">
              <Heart aria-hidden="true" className="text-black/30" size={22} />
            </div>
            <p className="text-sm font-semibold text-black lg:text-base">
              Dodajte jela u listu želja
            </p>
            <p className="mt-1 max-w-xs text-xs font-light text-black/55 lg:text-sm">
              Izaberite kategoriju sa desne strane i dodajte jela.
            </p>
          </div>
        ) : null}
      </div>

      {showGenerateAction ? (
        <div className="border-t border-black/5 bg-[#EFF1F4]/40 px-5 py-4 lg:px-6">
          {!canProceed ? (
            <p className="mb-3 text-center text-xs font-medium text-[#9a7209]">
              Dodajte bar jedno jelo pre nastavka.
            </p>
          ) : null}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:text-base"
            disabled={!canProceed || isGenerating}
            onClick={onGenerate}
            style={{
              backgroundImage: "linear-gradient(83deg, #5055D2 26%, #9093E1 100%)",
            }}
            type="button"
          >
            <Sparkles aria-hidden="true" size={18} />
            {isGenerating ? "Sačuvavanje..." : primaryActionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
