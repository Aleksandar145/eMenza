"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Heart, Sparkles, Star, Trash2 } from "lucide-react";
import {
  getFavoriteMatchLevels,
  getFavoritesForMealSlot,
  ingredientTagLabels,
  mealComponentSlots,
  mealSlotLabels,
  resolveFavorites,
  type AiRecommendation,
  type FavoriteEntry,
  type FavoriteMatchLevel,
  type MealComponentSlot,
} from "@/lib/ai-preporuka-mock";
import type { MealType } from "@/lib/dashboard-mock";

type FavoritesTableProps = {
  favorites: FavoriteEntry[];
  obrok: MealType;
  recommendation: AiRecommendation | null;
  onRemove: (entryId: string) => void;
  onMove: (entryId: string, direction: "up" | "down") => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  primaryActionLabel?: string;
  canProceed?: boolean;
  showGenerateAction?: boolean;
};

function TagBadge({ tag }: { tag: keyof typeof ingredientTagLabels }) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-[#EFF1F4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/55">
      {ingredientTagLabels[tag]}
    </span>
  );
}

function MatchBadge({ level }: { level: FavoriteMatchLevel }) {
  if (!level) {
    return null;
  }

  if (level === "recommended") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#5055D2]/30 bg-[#5055D2]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5055D2]">
        <Sparkles aria-hidden="true" size={11} />
        Preporučeno
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#d4a017]/40 bg-[#fff8e6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a7209]">
      <Star aria-hidden="true" size={11} />
      #1 izbor
    </span>
  );
}

function SlotSection({
  slot,
  entries,
  matchLevels,
  onRemove,
  onMove,
}: {
  slot: MealComponentSlot;
  entries: ReturnType<typeof resolveFavorites>;
  matchLevels: Record<string, FavoriteMatchLevel>;
  onRemove: (entryId: string) => void;
  onMove: (entryId: string, direction: "up" | "down") => void;
}) {
  const slotLabel = mealComponentSlots.find((item) => item.id === slot)?.label ?? slot;

  return (
    <section className="border-b border-black/5 last:border-b-0">
      <div className="bg-[#EFF1F4]/70 px-5 py-2.5 lg:px-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-black/55">{slotLabel}</h3>
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-4 text-xs font-light text-black/45 lg:px-6">
          Nema namirnica — dodajte sa desne strane.
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {entries.map((entry, index) => (
            <li
              className={`flex items-center gap-2 px-4 py-3 lg:px-5 ${
                matchLevels[entry.entryId] === "recommended"
                  ? "bg-[#5055D2]/5"
                  : matchLevels[entry.entryId] === "best"
                    ? "bg-[#fff8e6]/60"
                    : ""
              }`}
              key={entry.entryId}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#5055D2]/10 text-xs font-bold text-[#5055D2]">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-black">{entry.ingredient.name}</p>
                  {entry.isAllergic ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                      <AlertTriangle aria-hidden="true" size={11} />
                      Alergičan
                    </span>
                  ) : null}
                  <MatchBadge level={matchLevels[entry.entryId] ?? null} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {entry.ingredient.tags.slice(0, 3).map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  aria-label={`Pomeri ${entry.ingredient.name} gore`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2] disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => onMove(entry.entryId, "up")}
                  type="button"
                >
                  <ChevronUp aria-hidden="true" size={16} />
                </button>
                <button
                  aria-label={`Pomeri ${entry.ingredient.name} dole`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2] disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={index === entries.length - 1}
                  onClick={() => onMove(entry.entryId, "down")}
                  type="button"
                >
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
                <button
                  aria-label={`Ukloni ${entry.ingredient.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-red-50 hover:text-red-600"
                  onClick={() => onRemove(entry.entryId)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FavoritesTable({
  favorites,
  obrok,
  recommendation,
  onRemove,
  onMove,
  onGenerate,
  isGenerating = false,
  primaryActionLabel = "Generiši AI preporuku",
  canProceed = true,
  showGenerateAction = true,
}: FavoritesTableProps) {
  const mealMeta = mealSlotLabels[obrok];
  const mealFavorites = favorites.filter((entry) => entry.mealType === obrok);
  const matchLevels = getFavoriteMatchLevels(favorites, obrok, recommendation);

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="border-b border-black/5 px-5 py-4 lg:px-6 lg:py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
            <Heart aria-hidden="true" className="text-[#5055D2]" size={20} />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ backgroundColor: mealMeta.color }}
              >
                {mealMeta.short}
              </span>
              <h2 className="text-xl font-bold text-black lg:text-2xl">
                Omiljene — {mealMeta.label}
              </h2>
            </div>
            <p className="text-sm font-light text-black/55">
              Rangirajte namirnice po važnosti (↑↓). Prva u listi je najbolji izbor.
            </p>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D1D5DB] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        {mealFavorites.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#EFF1F4]">
              <Heart aria-hidden="true" className="text-black/30" size={22} />
            </div>
            <p className="text-sm font-semibold text-black lg:text-base">
              Dodajte namirnice za {mealMeta.label.toLowerCase()}
            </p>
            <p className="mt-1 max-w-xs text-xs font-light text-black/55 lg:text-sm">
              Popunite glavno jelo, dodatak, salatu i dezert sa desne strane.
            </p>
          </div>
        ) : (
          mealComponentSlots.map((slot) => (
            <SlotSection
              entries={resolveFavorites(getFavoritesForMealSlot(favorites, obrok, slot.id))}
              key={slot.id}
              matchLevels={matchLevels}
              onMove={onMove}
              onRemove={onRemove}
              slot={slot.id}
            />
          ))
        )}
      </div>

      {showGenerateAction ? (
        <div className="border-t border-black/5 bg-[#EFF1F4]/40 px-5 py-4 lg:px-6">
          {!canProceed ? (
            <p className="mb-3 text-center text-xs font-medium text-[#9a7209]">
              Rangirajte sve obroke (Doručak, Ručak, Večera) pre nastavka.
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
            {isGenerating
              ? primaryActionLabel === "Sačuvaj i nastavi"
                ? "Sačuvavanje..."
                : "Generisanje..."
              : primaryActionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
