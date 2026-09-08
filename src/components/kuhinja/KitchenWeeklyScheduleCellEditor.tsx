"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Ban, X } from "lucide-react";
import { KitchenSlotCatalogFilters } from "@/components/kuhinja/KitchenSlotCatalogFilters";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { dishStatusLabels, type Dish } from "@/lib/dish-catalog-mock";
import { DEFAULT_DISH_STOCK, kitchenSlotLabels, kitchenSlotOrder, type KitchenMenuSlotId } from "@/lib/kuhinja-mock";
import type { DailyMenuSlot } from "@/lib/kuhinja-mock";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { getJelovnikEditorHref, mealTypeLabels } from "@/lib/kuhinja-menu-overview";
import { getBlockedDishesForMeal } from "@/lib/blocked-dishes-store";
import {
  createEmptySlotFilters,
  filterCatalogDishes,
  type CatalogDishFilters,
  type SlotCatalogFilters,
} from "@/lib/kitchen-catalog-filters";
import type { WeeklyScheduleMeal } from "@/lib/kuhinja-weekly-schedule";
import type { MealType } from "@/lib/meal-types";

const cardClass =
  "rounded-[20px] border border-black/5 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]";

function uniqueCatalogDishes(dishes: Dish[]) {
  const seen = new Map<string, Dish>();

  for (const dish of dishes) {
    const key = `${dish.category}::${dish.name.trim().toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || (existing.status !== "active" && dish.status === "active")) {
      seen.set(key, dish);
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "sr"));
}

function isPersistedDishId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function kitchenCatalogDishes(catalogDishes: Dish[]) {
  return uniqueCatalogDishes(
    catalogDishes.filter(
      (dish) => isPersistedDishId(dish.id) && (dish.status === "active" || dish.status === "pending_approval"),
    ),
  );
}

function emptySlots(): DailyMenuSlot[] {
  return kitchenSlotOrder.map((slotId) => ({
    slotId,
    dishIds: [],
    dishStock: {},
  }));
}

type KitchenWeeklyScheduleCellEditorProps = {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  mealType: MealType;
  meal: WeeklyScheduleMeal;
  onSave: (slots: DailyMenuSlot[]) => void;
};

export function KitchenWeeklyScheduleCellEditor({
  isOpen,
  onClose,
  dateKey,
  mealType,
  meal,
  onSave,
}: KitchenWeeklyScheduleCellEditorProps) {
  const { state: catalogState } = useDishCatalog();
  const [draftSlots, setDraftSlots] = useState<DailyMenuSlot[]>(() => structuredClone(meal.slots));
  const [slotFilters, setSlotFilters] = useState<SlotCatalogFilters>(createEmptySlotFilters);

  const persistedCatalog = useMemo(
    () => kitchenCatalogDishes(catalogState.dishes),
    [catalogState.dishes],
  );

  function updateSlotFilters(slotId: KitchenMenuSlotId, patch: Partial<CatalogDishFilters>) {
    setSlotFilters((current) => ({
      ...current,
      [slotId]: { ...current[slotId], ...patch },
    }));
  }

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftSlots(structuredClone(meal.slots));
      setSlotFilters(createEmptySlotFilters());
    }
  }, [isOpen, meal.slots]);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape, isOpen]);

  function toggleDish(slotId: KitchenMenuSlotId, dishId: string, nextChecked: boolean) {
    setDraftSlots((current) =>
      current.map((slot) => {
        if (slot.slotId !== slotId) {
          return slot;
        }

        const dishIds = nextChecked
          ? slot.dishIds.includes(dishId)
            ? slot.dishIds
            : [...slot.dishIds, dishId]
          : slot.dishIds.filter((id) => id !== dishId);

        const dishStock = { ...slot.dishStock };
        if (nextChecked && !dishStock[dishId]) {
          dishStock[dishId] = DEFAULT_DISH_STOCK;
        }
        if (!nextChecked) {
          delete dishStock[dishId];
        }

        return { ...slot, dishIds, dishStock };
      }),
    );
  }

  function updateDishStock(slotId: KitchenMenuSlotId, dishId: string, stock: number) {
    setDraftSlots((current) =>
      current.map((slot) => {
        if (slot.slotId !== slotId || !slot.dishIds.includes(dishId)) {
          return slot;
        }

        return {
          ...slot,
          dishStock: {
            ...slot.dishStock,
            [dishId]: stock,
          },
        };
      }),
    );
  }

  function handleSave() {
    onSave(draftSlots);
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  const blockedForMeal = getBlockedDishesForMeal(dateKey, mealType);
  const blockedIds = new Set(blockedForMeal.map((b) => b.dishId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <button
        aria-label="Zatvori"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="weekly-schedule-cell-editor-title"
        aria-modal="true"
        className={`relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden ${cardClass}`}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Uredi obrok</p>
            <h2 className="mt-1 text-lg font-bold text-black" id="weekly-schedule-cell-editor-title">
              {mealTypeLabels[mealType]} — {formatCalendarDayLabel(dateKey)}
            </h2>
          </div>
          <button
            aria-label="Zatvori"
            className="rounded-full border border-black/10 p-2 hover:bg-black/5"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {kitchenSlotOrder.map((slotId) => {
              const slot = draftSlots.find((entry) => entry.slotId === slotId) ?? {
                slotId,
                dishIds: [],
                dishStock: {},
              };
              const slotCatalog = persistedCatalog.filter((dish) => dish.category === slotId);
              const catalogDishes = filterCatalogDishes(slotCatalog, slotFilters[slotId]);

              return (
                <section className="rounded-2xl border border-black/5 bg-[#EFF1F4]/40 p-4" key={slotId}>
                  <h3 className="text-sm font-bold text-black">{kitchenSlotLabels[slotId]}</h3>
                  <KitchenSlotCatalogFilters
                    filterBadges={slotFilters[slotId].badges}
                    idPrefix="schedule"
                    onFilterBadgesChange={(badges) => updateSlotFilters(slotId, { badges })}
                    onSearchQueryChange={(query) => updateSlotFilters(slotId, { query })}
                    searchQuery={slotFilters[slotId].query}
                    slotId={slotId}
                  />
                  <ul className="mt-3 space-y-2">
                    {catalogDishes.length === 0 ? (
                      <li className="text-sm text-black/45">
                        {slotCatalog.length === 0
                          ? "Nema jela u katalogu."
                          : "Nema jela za izabrane filtere"}
                      </li>
                    ) : (
                      catalogDishes.map((dish) => {
                        const isSelected = slot.dishIds.includes(dish.id);
                        const stock = slot.dishStock[dish.id] ?? DEFAULT_DISH_STOCK;
                        const isBlocked = blockedIds.has(dish.id);
                        const blockEntry = isBlocked ? blockedForMeal.find((b) => b.dishId === dish.id) : undefined;

                        return (
                          <li key={dish.id}>
                            <div className={`rounded-xl border bg-white px-3 py-2.5 ${
                              isBlocked ? "border-red-200 bg-red-50/50" : "border-black/5"
                            }`}>
                              <label className={`flex items-center gap-3 ${isBlocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
                                <input
                                  checked={isSelected}
                                  className="size-4 rounded border-black/20 text-[#5055D2]"
                                  disabled={dish.status !== "active" || isBlocked}
                                  onChange={(event) => toggleDish(slotId, dish.id, event.target.checked)}
                                  type="checkbox"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-sm ${isBlocked ? "text-red-600 line-through" : "text-black"}`}>
                                    {dish.name}
                                  </span>
                                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-black/45">{dish.priceRsd} RSD</span>
                                    <DishBadgeList badges={dish.badges} limit={2} />
                                    {isBlocked ? (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                        <Ban size={8} />
                                        Blokirano
                                      </span>
                                    ) : dish.status === "pending_approval" ? (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                        {dishStatusLabels.pending_approval}
                                      </span>
                                    ) : null}
                                  </span>
                                  {isBlocked && blockEntry ? (
                                    <p className="mt-1 text-[10px] text-red-500">
                                      Razlog: {blockEntry.reason}
                                    </p>
                                  ) : null}
                                </span>
                              </label>
                              {isSelected && dish.status === "active" && !isBlocked ? (
                                <div className="mt-2 flex items-center gap-2 pl-7">
                                  <label
                                    className="text-xs font-medium text-black/55"
                                    htmlFor={`schedule-stock-${slotId}-${dish.id}`}
                                  >
                                    Količina
                                  </label>
                                  <input
                                    className="w-20 rounded-lg border border-black/10 px-2 py-1 text-sm tabular-nums"
                                    id={`schedule-stock-${slotId}-${dish.id}`}
                                    min={0}
                                    onChange={(event) =>
                                      updateDishStock(slotId, dish.id, Number(event.target.value) || 0)
                                    }
                                    type="number"
                                    value={stock}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-5 py-4">
          <Link
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#5055D2] hover:underline"
            href={getJelovnikEditorHref(dateKey, mealType)}
          >
            Otvori u jelovniku
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
              onClick={onClose}
              type="button"
            >
              Otkaži
            </button>
            <button
              className="rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4549b8]"
              onClick={handleSave}
              type="button"
            >
              Sačuvaj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function createEmptyMealSlots() {
  return emptySlots();
}
