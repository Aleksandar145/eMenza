"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Copy, Eye, Plus } from "lucide-react";
import { KitchenSlotCatalogFilters } from "@/components/kuhinja/KitchenSlotCatalogFilters";
import { KitchenMenuWeekStrip } from "@/components/kuhinja/KitchenMenuWeekStrip";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { useKitchenWeekSelection } from "@/hooks/useKitchenWeekSelection";
import { useKuhinjaJelovnik } from "@/hooks/useKuhinjaJelovnik";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { canEditKitchenMenu, normalizeKitchenStaffRole } from "@/lib/kuhinja-roles";
import { useToast } from "@/components/shared/toast/useToast";
import { ApiError } from "@/lib/api/client";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import {
  dishCategoryLabels,
  dishStatusLabels,
  type DishBadge,
  type DishCategory,
} from "@/lib/dish-catalog-mock";
import { proposeDish } from "@/lib/dish-catalog-store";
import type { Dish } from "@/lib/dish-catalog-mock";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { DishBadgePicker } from "@/components/dish-catalog/DishBadgePicker";
import { DEFAULT_DISH_STOCK, kitchenSlotLabels, kitchenSlotOrder, type KitchenMenuSlotId } from "@/lib/kuhinja-mock";
import {
  copyMenuFromLastWeek,
  copyMenuFromYesterday,
  ensureJelovnikRangeLoaded,
  getEditorMenuOptions,
  hasUnsavedMenuChanges,
  publishMenu,
  setSlotDishStock,
  toggleSlotDish,
} from "@/lib/kuhinja-jelovnik-store";
import { isKitchenMenuDataReady } from "@/lib/kitchen-data-ready";
import {
  createEmptySlotFilters,
  filterCatalogDishes,
  type CatalogDishFilters,
  type SlotCatalogFilters,
} from "@/lib/kitchen-catalog-filters";
import {
  formatUncreatedMealsNotice,
  getWeekStartForDate,
  isDateInWeek,
  parseKitchenMenuDateParam,
  parseKitchenMenuMealParam,
} from "@/lib/kuhinja-menu-overview";
import type { MealType } from "@/lib/meal-types";

const mealTabs: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Doručak" },
  { type: "lunch", label: "Ručak" },
  { type: "dinner", label: "Večera" },
];

const defaultMealImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBetAAxPDFoAwyj39KbGs-WY3KcbOJtwNyHxBNUSBEldKIOeQhN_Nn4Ypkj-IWMrCQslLJ1jpG17RExM2S7Zj1kyJLyDC0JdU0krXbvaAKhSRDdHFN99CXo2jkRom2PUNPZd3yblKxX8tIJlusjc7JsAvSfIEPziEBWrJFGTE9B2aoAy1F4PsBVHA-G8AaRhLZy__8UF6m8zx_u6ttAyOKdCI9MMsOSGWn2l51RnPirOhahIg2D5bJLY3lrUfatIFTuPN4fEWOiXs0";

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

function emptyMenuEntry(dateKey: string, mealType: MealType) {
  return {
    id: `menu-${dateKey}-${mealType}`,
    dateKey,
    mealType,
    slots: kitchenSlotOrder.map((slotId) => ({
      slotId,
      dishIds: [] as string[],
      dishStock: {} as Record<string, number>,
    })),
    published: false,
    updatedAt: new Date().toISOString(),
  };
}
function isDishSelectedOnSlot(dish: Dish, selectedIds: string[]) {
  return selectedIds.includes(dish.id);
}

export function KitchenMenuPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { session } = useKuhinjaSessionContext();
  const { state, refresh } = useKuhinjaJelovnik();
  const { state: catalogState } = useDishCatalog();
  const canEdit = canEditKitchenMenu(normalizeKitchenStaffRole(session?.role));
  const initialDateKey = parseKitchenMenuDateParam(searchParams.get("date"));
  const [mealType, setMealType] = useState<MealType>(() =>
    parseKitchenMenuMealParam(searchParams.get("obrok")),
  );

  function syncEditorUrl(nextDateKey: string, nextMealType: MealType) {
    const params = new URLSearchParams();
    params.set("date", nextDateKey);
    params.set("obrok", nextMealType);
    router.replace(`/kuhinja/jelovnik?${params.toString()}`, { scroll: false });
  }

  const {
    todayDateKey,
    selectedDateKey: dateKey,
    weekStartDateKey,
    setSelectedDateKey: setDateKey,
    setWeekStartDateKey,
    weekStripProps,
  } = useKitchenWeekSelection({
    initialDateKey,
    onSelectedDateChange: (nextDateKey) => {
      syncEditorUrl(nextDateKey, mealType);
    },
  });
  const [menuError, setMenuError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [proposeCategory, setProposeCategory] = useState<DishCategory>("main");
  const [proposeName, setProposeName] = useState("");
  const [proposePrice, setProposePrice] = useState(0);
  const [proposeImageUrl, setProposeImageUrl] = useState(defaultMealImage);
  const [proposeBadges, setProposeBadges] = useState<DishBadge[]>([]);
  const [slotFilters, setSlotFilters] = useState<SlotCatalogFilters>(createEmptySlotFilters);

  useEffect(() => {
    void ensureJelovnikRangeLoaded(weekStartDateKey);
  }, [weekStartDateKey]);

  useEffect(() => {
    const nextDateKey = parseKitchenMenuDateParam(searchParams.get("date"));
    const nextMealType = parseKitchenMenuMealParam(searchParams.get("obrok"));
    setDateKey(nextDateKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMealType(nextMealType);
    setWeekStartDateKey((current) =>
      isDateInWeek(nextDateKey, current) ? current : getWeekStartForDate(nextDateKey, todayDateKey),
    );
  }, [searchParams, todayDateKey, setDateKey, setWeekStartDateKey]);

  function handleMealTypeChange(nextMealType: MealType) {
    setMealType(nextMealType);
    syncEditorUrl(dateKey, nextMealType);
  }

  function updateSlotFilters(slotId: KitchenMenuSlotId, patch: Partial<CatalogDishFilters>) {
    setSlotFilters((current) => ({
      ...current,
      [slotId]: { ...current[slotId], ...patch },
    }));
  }

  const persistedCatalog = useMemo(
    () => kitchenCatalogDishes(catalogState.dishes),
    [catalogState.dishes],
  );
  const uncreatedMealsNotice = useMemo(
    () => formatUncreatedMealsNotice(dateKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, state.menus],
  );
  const catalogIdSet = useMemo(
    () => new Set(persistedCatalog.map((dish) => dish.id)),
    [persistedCatalog],
  );

  const menu = useMemo(() => {
    const found =
      state.menus.find((entry) => entry.dateKey === dateKey && entry.mealType === mealType) ??
      emptyMenuEntry(dateKey, mealType);

    return {
      ...found,
      slots: found.slots.map((slot) => ({
        ...slot,
        dishIds: slot.dishIds.filter((id) => catalogIdSet.has(id)),
        dishStock: Object.fromEntries(
          Object.entries(slot.dishStock).filter(([id]) => catalogIdSet.has(id)),
        ),
      })),
    };
  }, [state.menus, dateKey, mealType, catalogIdSet]);

  const previewOptions = getEditorMenuOptions(dateKey, mealType);
  const hasUnsavedChanges = hasUnsavedMenuChanges(dateKey, mealType);
  const isDataReady = isKitchenMenuDataReady();

  function toggleDish(
    slotId: (typeof kitchenSlotOrder)[number],
    dishId: string,
    nextChecked: boolean,
  ) {
    setMenuError(null);
    toggleSlotDish(dateKey, mealType, slotId, dishId, nextChecked);
  }

  function updateDishStock(
    slotId: (typeof kitchenSlotOrder)[number],
    dishId: string,
    stock: number,
  ) {
    setMenuError(null);
    setSlotDishStock(dateKey, mealType, slotId, dishId, stock);
  }

  function handlePublish() {
    setMenuError(null);
    setIsPublishing(true);
    const wasPublished = menu.published;
    void publishMenu(dateKey, mealType)
      .then(() => {
        toast.success(
          wasPublished ? "Promene jelovnika uspešno sačuvane" : "Jelovnik uspešno objavljen",
        );
      })
      .catch((error) => {
        const message =
          error instanceof ApiError
            ? error.status === 401
              ? "Sesija je istekla. Prijavite se ponovo na /kuhinja/login (npr. kuhinja@emenza.rs)."
              : error.message
            : "Objava jelovnika nije uspela.";
        setMenuError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsPublishing(false);
      });
  }

  function handleProposeDish() {
    if (!proposeName.trim()) return;
    proposeDish({
      name: proposeName,
      category: proposeCategory,
      priceRsd: proposePrice,
      imageUrl: proposeImageUrl.trim() || defaultMealImage,
      badges: proposeBadges,
    });
    toast.success("Predlog jela poslat na odobrenje");
    setProposeName("");
    setProposePrice(0);
    setProposeBadges([]);
    setShowProposeForm(false);
    refresh();
  }

  return (
    <div className="space-y-5">
      {!isDataReady ? (
        <div className={`flex items-center gap-2 p-4 text-sm text-black/55 ${cardClass}`}>
          <span className="inline-block size-4 animate-spin rounded-full border-2 border-[#5055D2]/25 border-t-[#5055D2]" />
          Učitavam katalog jela i jelovnik…
        </div>
      ) : null}
      {menuError ? (
        <p className={`rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ${cardClass}`} role="alert">
          {menuError}
        </p>
      ) : null}

      <KitchenMenuWeekStrip {...weekStripProps} />

      <div className={`flex flex-wrap items-end gap-4 p-5 ${cardClass}`}>
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Izabrani dan</p>
            <p className="text-sm font-semibold text-black">{formatCalendarDayLabel(dateKey)}</p>
            {uncreatedMealsNotice ? (
              <>
                <span aria-hidden="true" className="text-sm text-black/25">
                  ·
                </span>
                <p className="text-sm text-amber-800">{uncreatedMealsNotice}</p>
              </>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mealTabs.map((tab) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  mealType === tab.type
                    ? "bg-[#5055D2] text-white"
                    : "bg-black/5 text-black/70 hover:bg-black/10"
                }`}
                key={tab.type}
                onClick={() => handleMealTypeChange(tab.type)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {canEdit ? (
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
            href={`/kuhinja/nedeljni-raspored?week=${encodeURIComponent(weekStartDateKey)}`}
          >
            <CalendarRange aria-hidden="true" size={14} />
            Kreiraj pomoću nedeljnog rasporeda
          </Link>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
            onClick={() => setShowProposeForm((current) => !current)}
            type="button"
          >
            <Plus aria-hidden="true" size={14} />
            Predloži novo jelo
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
            onClick={() => copyMenuFromYesterday(dateKey, mealType)}
            type="button"
          >
            <Copy aria-hidden="true" size={14} />
            Kopiraj sa juče
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
            onClick={() => copyMenuFromLastWeek(dateKey, mealType)}
            type="button"
          >
            <Copy aria-hidden="true" size={14} />
            Prošla nedelja
          </button>
          {hasUnsavedChanges ? (
            <span className="self-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Nesačuvane izmene
            </span>
          ) : null}
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
              menu.published ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-[#5055D2] text-white"
            }`}
            disabled={isPublishing || !isDataReady}
            onClick={handlePublish}
            type="button"
          >
            {isPublishing
              ? "Čuvam…"
              : menu.published
                ? "Sačuvaj promene"
                : "Objavi jelovnik"}
          </button>
        </div>
        ) : null}
      </div>

      {canEdit && showProposeForm ? (
        <section className={`border-[#5055D2]/20 bg-[#5055D2]/5 p-5 ${cardClass}`}>
          <h3 className="text-sm font-bold text-black">Predlog novog jela</h3>
          <p className="mt-1 text-sm text-black/55">
            Admin mora odobriti pre nego što jelo postane dostupno studentima.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="rounded-xl border border-black/10 px-3 py-2 text-sm"
              onChange={(event) => setProposeName(event.target.value)}
              placeholder="Ime jela"
              value={proposeName}
            />
            <select
              className="rounded-xl border border-black/10 px-3 py-2 text-sm"
              onChange={(event) => setProposeCategory(event.target.value as DishCategory)}
              value={proposeCategory}
            >
              {kitchenSlotOrder.map((slotId) => (
                <option key={slotId} value={slotId}>
                  {dishCategoryLabels[slotId]}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-black/10 px-3 py-2 text-sm"
              min={0}
              onChange={(event) => setProposePrice(Number(event.target.value) || 0)}
              placeholder="Cena (RSD)"
              type="number"
              value={proposePrice || ""}
            />
            <input
              className="rounded-xl border border-black/10 px-3 py-2 text-sm lg:col-span-2"
              onChange={(event) => setProposeImageUrl(event.target.value)}
              placeholder="URL slike"
              value={proposeImageUrl}
            />
            <DishBadgePicker onChange={setProposeBadges} value={proposeBadges} />
          </div>
          <button
            className="mt-4 rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white"
            onClick={handleProposeDish}
            type="button"
          >
            Pošalji predlog
          </button>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {kitchenSlotOrder.map((slotId) => {
          const slot = menu.slots.find((entry) => entry.slotId === slotId);
          const slotCatalog = persistedCatalog.filter((dish) => dish.category === slotId);
          const catalogDishes = filterCatalogDishes(slotCatalog, slotFilters[slotId]);
          const selectedIds = slot?.dishIds ?? [];

          return (
            <section className={`p-5 ${cardClass}`} key={slotId}>
              <h3 className="text-sm font-bold text-black">{kitchenSlotLabels[slotId]}</h3>
              <KitchenSlotCatalogFilters
                filterBadges={slotFilters[slotId].badges}
                onFilterBadgesChange={(badges) => updateSlotFilters(slotId, { badges })}
                onSearchQueryChange={(query) => updateSlotFilters(slotId, { query })}
                searchQuery={slotFilters[slotId].query}
                slotId={slotId}
              />
              <ul className="mt-3 space-y-2">
                {!isDataReady ? (
                  Array.from({ length: 3 }, (_, index) => (
                    <li key={index}>
                      <div className="rounded-xl border border-black/5 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="size-4 animate-pulse rounded bg-black/10" />
                          <div className="h-4 flex-1 animate-pulse rounded bg-black/10" />
                        </div>
                      </div>
                    </li>
                  ))
                ) : catalogDishes.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-black/10 px-3 py-4 text-sm text-black/45">
                    Nema jela za izabrane filtere
                  </li>
                ) : (
                catalogDishes.map((dish) => {
                  const isSelected = isDishSelectedOnSlot(dish, selectedIds);
                  const stock = slot?.dishStock[dish.id] ?? DEFAULT_DISH_STOCK;

                  return (
                    <li key={dish.id}>
                      {canEdit ? (
                      <div className="rounded-xl border border-black/5 px-3 py-2.5 hover:bg-black/[0.02]">
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            checked={isSelected}
                            className="size-4 rounded border-black/20 text-[#5055D2]"
                            disabled={dish.status !== "active" || !isDataReady}
                            onChange={(event) => {
                              toggleDish(slotId, dish.id, event.target.checked);
                            }}
                            type="checkbox"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-black">{dish.name}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-black/45">{dish.priceRsd} RSD</span>
                              <DishBadgeList badges={dish.badges} limit={2} />
                              {dish.status === "pending_approval" ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  {dishStatusLabels.pending_approval}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </label>
                        {isSelected && dish.status === "active" ? (
                          <div className="mt-2 flex items-center gap-2 pl-7">
                            <label className="text-xs font-medium text-black/55" htmlFor={`stock-${slotId}-${dish.id}`}>
                              Dostupna količina
                            </label>
                            <input
                              className="w-20 rounded-lg border border-black/10 px-2 py-1 text-sm tabular-nums"
                              id={`stock-${slotId}-${dish.id}`}
                              min={0}
                              onChange={(event) =>
                                updateDishStock(slotId, dish.id, Number(event.target.value) || 0)
                              }
                              type="number"
                              value={stock}
                            />
                            <span className="text-xs text-black/45">porcija</span>
                          </div>
                        ) : null}
                      </div>
                      ) : (
                      <div className={`rounded-xl border px-3 py-2.5 ${isSelected ? "border-[#5055D2]/20 bg-[#5055D2]/5" : "border-black/5"}`}>
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <span className="flex size-4 items-center justify-center rounded bg-[#5055D2] text-[10px] font-bold text-white">✓</span>
                          ) : (
                            <span className="size-4 rounded border border-black/10" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-black">{dish.name}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-black/45">{dish.priceRsd} RSD</span>
                              <DishBadgeList badges={dish.badges} limit={2} />
                              {dish.status === "pending_approval" ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  {dishStatusLabels.pending_approval}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          {isSelected ? (
                            <span className="text-xs font-semibold text-[#5055D2]">{stock} porcija</span>
                          ) : null}
                        </div>
                      </div>
                      )}
                    </li>
                  );
                })
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <section className={`p-5 ${cardClass}`}>
        <div className="flex items-center gap-2">
          <Eye aria-hidden="true" className="text-[#5055D2]" size={18} />
          <h3 className="text-sm font-bold text-black">Pregled za studente</h3>
        </div>
        <p className="mt-2 text-sm text-black/55">
          {menu.published
            ? hasUnsavedChanges
              ? "Imate nesačuvane izmene — studenti još uvek vide prethodnu objavljenu verziju."
              : "Studenti vide isti sadržaj u kreatoru obroka."
            : "Jelovnik nije objavljen — studenti ne mogu birati jela u kreatoru za ovaj dan/obrok."}
        </p>
        {previewOptions ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {kitchenSlotOrder.map((slotId) => (
              <div className="rounded-xl bg-black/[0.03] px-4 py-3" key={slotId}>
                <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  {kitchenSlotLabels[slotId]}
                </p>
                <p className="mt-1 text-sm text-black">
                  {previewOptions[slotId]
                    .map((option) => `${option.name} (${option.stock})`)
                    .join(", ") || "—"}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
