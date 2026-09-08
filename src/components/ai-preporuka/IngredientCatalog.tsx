"use client";

import { AlertTriangle, Plus, Search, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import {
  allIngredients,
  filterIngredients,
  ingredientFilters,
  ingredientTagLabels,
  mealComponentSlots,
  mealComponentSlotLabels,
  type Ingredient,
  type IngredientFilterId,
  type MealComponentSlot,
} from "@/lib/ai-preporuka-mock";

type IngredientCatalogProps = {
  favoriteKeys: string[];
  onAdd: (ingredient: Ingredient, slot: MealComponentSlot, isAllergic: boolean) => void;
  preferPosno?: boolean;
};

function favoriteKey(ingredientId: string, slot: MealComponentSlot) {
  return `${ingredientId}:${slot}`;
}

function TagBadge({ tag }: { tag: keyof typeof ingredientTagLabels }) {
  return (
    <span className="inline-flex rounded-full border border-black/8 bg-[#EFF1F4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/55">
      {ingredientTagLabels[tag]}
    </span>
  );
}

export function IngredientCatalog({
  favoriteKeys,
  onAdd,
  preferPosno = false,
}: IngredientCatalogProps) {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<IngredientFilterId[]>(() =>
    preferPosno ? ["posno"] : ["all"],
  );
  const [activeSlot, setActiveSlot] = useState<MealComponentSlot>("glavno_jelo");
  const [isAllergic, setIsAllergic] = useState(false);

  const filteredIngredients = useMemo(
    () => filterIngredients(allIngredients, search, activeFilters, activeSlot),
    [search, activeFilters, activeSlot],
  );

  const availableIngredients = useMemo(
    () =>
      filteredIngredients.filter(
        (ingredient) => !favoriteKeys.includes(favoriteKey(ingredient.id, activeSlot)),
      ),
    [filteredIngredients, favoriteKeys, activeSlot],
  );

  const allAddedInSlot =
    filteredIngredients.length > 0 && availableIngredients.length === 0;

  function toggleFilter(filterId: IngredientFilterId) {
    if (filterId === "all") {
      setActiveFilters(["all"]);
      return;
    }

    setActiveFilters((current) => {
      const withoutAll = current.filter((item) => item !== "all");
      const isActive = withoutAll.includes(filterId);
      const next = isActive
        ? withoutAll.filter((item) => item !== filterId)
        : [...withoutAll, filterId];

      return next.length === 0 ? ["all"] : next;
    });
  }

  function isFilterActive(filterId: IngredientFilterId) {
    if (filterId === "all") {
      return activeFilters.includes("all");
    }
    return activeFilters.includes(filterId);
  }

  function handleAdd(ingredient: Ingredient) {
    onAdd(ingredient, activeSlot, isAllergic);
    setIsAllergic(false);
  }

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="border-b border-black/5 px-5 py-4 lg:px-6 lg:py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
            <UtensilsCrossed aria-hidden="true" className="text-[#5055D2]" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black lg:text-2xl">Sve namirnice</h2>
            <p className="mt-1 text-sm font-light text-black/55">
              Izaberite deo obroka i dodajte namirnice u rang listu
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-b border-black/5 px-5 py-4 lg:px-6">
        {preferPosno ? (
          <p className="rounded-xl bg-[#2f8f55]/8 px-3 py-2.5 text-xs font-medium text-[#2f8f55] lg:text-sm">
            Post je aktivan — prikazane su posne namirnice. Filter možete promeniti ispod.
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45">
            Deo obroka
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mealComponentSlots.map((slot) => {
              const isActive = activeSlot === slot.id;

              return (
                <button
                  aria-pressed={isActive}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors lg:text-sm ${
                    isActive
                      ? "border-[#5055D2] bg-[#5055D2]/10 text-[#5055D2]"
                      : "border-black/8 bg-white text-black/65 hover:border-[#5055D2]/25"
                  }`}
                  key={slot.id}
                  onClick={() => setActiveSlot(slot.id)}
                  type="button"
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-light text-black/45">
            Dodajete u:{" "}
            <span className="font-semibold text-[#5055D2]">
              {mealComponentSlotLabels[activeSlot]}
            </span>
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2.5">
          <input
            checked={isAllergic}
            className="size-4 rounded border-red-300 text-red-600 focus:ring-red-300/40"
            onChange={(event) => setIsAllergic(event.target.checked)}
            type="checkbox"
          />
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-800">
            <AlertTriangle aria-hidden="true" size={16} />
            Alergičan na ovu namirnicu
          </span>
        </label>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
            size={18}
          />
          <input
            className="w-full rounded-xl border border-black/8 bg-white py-2.5 pl-11 pr-4 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pretraži namirnice..."
            type="search"
            value={search}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/45">
            Filteri namirnica
          </p>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="inline-flex min-w-full rounded-full border border-black/5 bg-[#EFF1F4]/60 p-0.5 sm:min-w-0">
              {ingredientFilters.map((filter) => {
                const isActive = isFilterActive(filter.id);

                return (
                  <button
                    aria-pressed={isActive}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors lg:px-4 lg:text-sm ${
                      isActive
                        ? "bg-[#5055D2] text-white"
                        : "text-black/55 hover:text-[#5055D2]"
                    }`}
                    key={filter.id}
                    onClick={() => toggleFilter(filter.id)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4 lg:px-6 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D1D5DB] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        {availableIngredients.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-black">
              {allAddedInSlot ? "Sve namirnice su dodate" : "Nema rezultata"}
            </p>
            <p className="mt-1 text-xs font-light text-black/55">
              {allAddedInSlot
                ? "Uklonite stavku sa leve liste da biste je ponovo videli ovde."
                : "Pokušajte sa drugim delom obroka, filterima ili pretragom."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {availableIngredients.map((ingredient) => (
              <li
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#EFF1F4]/30 px-4 py-3 transition-colors hover:border-[#5055D2]/20 hover:bg-white"
                key={ingredient.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-black">{ingredient.name}</p>
                    <span className="text-xs font-light text-black/45">{ingredient.category}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ingredient.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                </div>
                <button
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isAllergic
                      ? "border border-red-400 bg-red-50 text-red-700 hover:bg-red-100"
                      : "border border-[#5055D2] bg-white text-[#5055D2] hover:bg-[#5055D2]/5"
                  }`}
                  onClick={() => handleAdd(ingredient)}
                  type="button"
                >
                  <Plus aria-hidden="true" size={14} />
                  {isAllergic ? "Dodaj alerg." : "Dodaj"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
