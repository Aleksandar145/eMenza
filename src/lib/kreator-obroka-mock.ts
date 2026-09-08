import type { MealType } from "@/lib/meal-types";
import type { DishBadge } from "@/lib/dish-catalog-mock";
import { dishCategoryLabels, dishToMealOption } from "@/lib/dish-catalog-mock";
import {
  getActiveDishes,
  getDishesByCategory,
} from "@/lib/dish-catalog-store";
import { getPublishedMenuOptions, isDailyMenuPublished } from "@/lib/kuhinja-jelovnik-store";

export type MealOption = {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  badges: DishBadge[];
  image: string;
  disabled?: boolean;
};

export type CreatorSlotId = "main" | "side" | "salad" | "dessert";

export type CreatorSlotPicks = Record<CreatorSlotId, MealOption[]>;

export const creatorSlotOrder: CreatorSlotId[] = ["main", "side", "salad", "dessert"];

export type MealOptionDisabledReason = "soldOut" | "insufficientFunds";

export const MEAL_SOLD_OUT_LABEL = "NESTALO";
export const MEAL_INSUFFICIENT_FUNDS_LABEL = "Nemate dovoljno novca na računu za ovo jelo";

export function formatPicksSummary(picks: MealOption[]) {
  if (picks.length === 0) {
    return "Nije izabrano";
  }

  if (picks.length === 1) {
    return picks[0].name;
  }

  if (picks[0].name === picks[1].name) {
    return `${picks[0].name} ×2`;
  }

  return `${picks[0].name} + ${picks[1].name}`;
}
export const MEAL_INSUFFICIENT_FUNDS_BADGE = "Nedovoljno sredstava";

export function formatMealDisabledLabel(
  reason: MealOptionDisabledReason,
  variant: "badge" | "detail" = "detail",
): string {
  if (reason === "soldOut") {
    return MEAL_SOLD_OUT_LABEL;
  }

  return variant === "badge" ? MEAL_INSUFFICIENT_FUNDS_BADGE : MEAL_INSUFFICIENT_FUNDS_LABEL;
}

export function isMealSoldOut(meal: MealOption) {
  return meal.stock <= 0 || Boolean(meal.disabled);
}

export function calculateOtherSlotsTotal(slotPicks: CreatorSlotPicks, slotId: CreatorSlotId) {
  return creatorSlotOrder.reduce(
    (sum, id) => sum + (id === slotId ? 0 : calculateSlotPicksTotal(slotPicks[id] ?? [])),
    0,
  );
}

export function canAffordMealPick(params: {
  balanceRsd: number;
  otherSlotsTotal: number;
  existingPicks: MealOption[];
  meal: MealOption;
  choosingSecond: boolean;
}) {
  const { balanceRsd, otherSlotsTotal, existingPicks, meal, choosingSecond } = params;

  if (existingPicks.length === 0) {
    return otherSlotsTotal + meal.price <= balanceRsd;
  }

  if (choosingSecond && existingPicks.length === 1) {
    return otherSlotsTotal + existingPicks[0].price + meal.price <= balanceRsd;
  }

  return otherSlotsTotal + meal.price <= balanceRsd;
}

export function canAffordDuplicatePick(params: {
  balanceRsd: number;
  otherSlotsTotal: number;
  pick: MealOption;
}) {
  return params.otherSlotsTotal + 2 * params.pick.price <= params.balanceRsd;
}

export function resolveMealDisabledState(params: {
  meal: MealOption;
  balanceRsd: number;
  otherSlotsTotal: number;
  existingPicks: MealOption[];
  choosingSecond: boolean;
}): { disabled: boolean; reason?: MealOptionDisabledReason } {
  if (isMealSoldOut(params.meal)) {
    return { disabled: true, reason: "soldOut" };
  }

  if (
    !canAffordMealPick({
      balanceRsd: params.balanceRsd,
      otherSlotsTotal: params.otherSlotsTotal,
      existingPicks: params.existingPicks,
      meal: params.meal,
      choosingSecond: params.choosingSecond,
    })
  ) {
    return { disabled: true, reason: "insufficientFunds" };
  }

  return { disabled: false };
}

export const creatorSlotLabels: Record<CreatorSlotId, string> = {
  main: "Glavno jelo",
  side: "Dodatak",
  salad: "Salata",
  dessert: "Dezert",
};

export const optionalCreatorSlots: CreatorSlotId[] = ["side", "salad", "dessert"];

export function hasSelectableMealOptions(options: MealOption[]): boolean;
export function hasSelectableMealOptions(
  options: MealOption[],
  balanceRsd: number,
  otherSlotsTotal?: number,
): boolean;
export function hasSelectableMealOptions(
  options: MealOption[],
  balanceRsd?: number,
  otherSlotsTotal = 0,
): boolean {
  return options.some((option) => {
    if (isMealSoldOut(option)) {
      return false;
    }

    if (balanceRsd === undefined) {
      return true;
    }

    return otherSlotsTotal + option.price <= balanceRsd;
  });
}

export function getFirstSelectableOption(
  options: MealOption[],
  balanceRsd?: number,
  spentRsd = 0,
): MealOption | undefined {
  return options.find((option) => {
    if (isMealSoldOut(option)) {
      return false;
    }

    if (balanceRsd === undefined) {
      return true;
    }

    return spentRsd + option.price <= balanceRsd;
  });
}

export function canSkipCreatorSlot(
  slotId: CreatorSlotId,
  options: MealOption[],
  picks: MealOption[],
  balanceRsd?: number,
  otherSlotsTotal = 0,
): boolean {
  if (options.length === 0 || !hasSelectableMealOptions(options, balanceRsd ?? 0, otherSlotsTotal)) {
    return true;
  }

  if (optionalCreatorSlots.includes(slotId)) {
    return true;
  }

  return picks.length > 0;
}

export type KreatorMenuContext = {
  dateKey: string;
  mealType: MealType;
};

export function isKreatorMenuAvailable(context: KreatorMenuContext): boolean {
  return isDailyMenuPublished(context.dateKey, context.mealType);
}

export function getKreatorObrokaOptionsBySlot(
  context?: KreatorMenuContext,
): Record<CreatorSlotId, MealOption[]> {
  if (context) {
    const published = getPublishedMenuOptions(context.dateKey, context.mealType);
    if (!published) {
      return creatorSlotOrder.reduce(
        (acc, slotId) => {
          acc[slotId] = [];
          return acc;
        },
        {} as Record<CreatorSlotId, MealOption[]>,
      );
    }
    return published;
  }

  return creatorSlotOrder.reduce(
    (acc, slotId) => {
      acc[slotId] = getDishesByCategory(slotId).map((dish) => dishToMealOption(dish));
      return acc;
    },
    {} as Record<CreatorSlotId, MealOption[]>,
  );
}

export const MAX_PICKS_PER_SLOT = 2;

export function getDefaultSlotPicks(context: KreatorMenuContext): CreatorSlotPicks {
  const optionsBySlot = getKreatorObrokaOptionsBySlot(context);
  return getDefaultSlotPicksFromOptions(optionsBySlot);
}

export function getDefaultSlotPicksFromOptions(
  optionsBySlot: Record<CreatorSlotId, MealOption[]>,
  balanceRsd?: number,
): CreatorSlotPicks {
  const meal = getFirstSelectableOption(optionsBySlot.main, balanceRsd, 0);

  return {
    main: meal ? [meal] : [],
    side: [],
    salad: [],
    dessert: [],
  };
}

export function canAddPick(picks: MealOption[]) {
  return picks.length < MAX_PICKS_PER_SLOT;
}

export function addSlotPick(picks: MealOption[], meal: MealOption) {
  if (!canAddPick(picks)) {
    return picks;
  }

  return [...picks, meal];
}

export function removeSlotPickAt(picks: MealOption[], index: number) {
  return picks.filter((_, pickIndex) => pickIndex !== index);
}

export function duplicateFirstSlotPick(picks: MealOption[]) {
  if (picks.length === 0 || picks.length >= MAX_PICKS_PER_SLOT) {
    return picks;
  }

  return [picks[0], picks[0]];
}

export function countMealInPicks(picks: MealOption[], meal: MealOption) {
  return picks.filter((pick) => pick.id === meal.id).length;
}

export function calculateSlotPicksTotal(picks: MealOption[]) {
  return picks.reduce((sum, meal) => sum + meal.price, 0);
}

export function calculateCreatorTotalFromPicks(slotPicks: CreatorSlotPicks) {
  return creatorSlotOrder.reduce(
    (sum, slotId) => sum + calculateSlotPicksTotal(slotPicks[slotId] ?? []),
    0,
  );
}

function formatSlotPicksForReservation(picks: MealOption[]) {
  if (picks.length === 0) {
    return "—";
  }

  if (picks.length === 1) {
    return picks[0].name;
  }

  if (picks[0].name === picks[1].name) {
    return `${picks[0].name} ×2`;
  }

  return `${picks[0].name} + ${picks[1].name}`;
}

const POSNO_BADGES = new Set(["posno", "voce", "povrce"]);

export function slotPicksToMealDetails(slotPicks: CreatorSlotPicks) {
  const allPicks = creatorSlotOrder.flatMap((slotId) => slotPicks[slotId] ?? []);
  const isPosno = allPicks.length > 0 && allPicks.every((pick) => pick.badges.some((badge) => POSNO_BADGES.has(badge)));

  return {
    glavnoJelo: formatSlotPicksForReservation(slotPicks.main),
    dodatak: formatSlotPicksForReservation(slotPicks.side),
    salata: formatSlotPicksForReservation(slotPicks.salad),
    obrok: formatSlotPicksForReservation(slotPicks.dessert),
    isPosno,
  };
}

export type ReservationDishIds = Record<CreatorSlotId, string[]>;

export function slotPicksToDishIds(slotPicks: CreatorSlotPicks): ReservationDishIds {
  return {
    main: slotPicks.main.map((pick) => pick.id),
    side: slotPicks.side.map((pick) => pick.id),
    salad: slotPicks.salad.map((pick) => pick.id),
    dessert: slotPicks.dessert.map((pick) => pick.id),
  };
}

export function getKreatorObrokaMealOptions(): MealOption[] {
  return getActiveDishes()
    .filter((dish) => dish.category === "main")
    .map((dish) => dishToMealOption(dish));
}

export function getKreatorObrokaHref(params?: { dateKey?: string; obrok?: MealType }) {
  const search = new URLSearchParams();

  if (params?.dateKey) {
    search.set("datum", params.dateKey);
  }

  if (params?.obrok) {
    search.set("obrok", params.obrok);
  }

  const query = search.toString();
  return query ? `/kreator-obroka?${query}` : "/kreator-obroka";
}

export function parseKreatorObrokaObrok(value: string | null): MealType | null {
  if (value === "breakfast" || value === "lunch" || value === "dinner") {
    return value;
  }

  return null;
}

export function getDishCategoryLabel(category: CreatorSlotId): string {
  return dishCategoryLabels[category];
}
