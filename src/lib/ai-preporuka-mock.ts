import type { MealComponentSlot, MealType } from "@/lib/meal-types";
import { getMealPrices } from "@/lib/admin-system-store";
import { isMealTypeInWorkingHours } from "@/lib/schedule-utils";
import { getPublishedMenuOptions, isDailyMenuPublished } from "@/lib/kuhinja-jelovnik-store";
import {
  getKreatorObrokaMealOptions,
  parseKreatorObrokaObrok,
  type CreatorSlotId,
  type MealOption,
} from "@/lib/kreator-obroka-mock";
import type { AiRecommendationRpcRow } from "@/lib/backend/ai-preporuka-api";
import type { DishWishlist } from "@/lib/dish-wishlist-store";
import { getDishById } from "@/lib/dish-catalog-store";

export type IngredientTag =
  | "vege"
  | "posno"
  | "vegan"
  | "meso"
  | "mlecno"
  | "gluten_free";

export type IngredientCategory =
  | "Povrće"
  | "Meso"
  | "Mlečno"
  | "Žitarice"
  | "Voće"
  | "Mahunarke";

export type { MealComponentSlot };

export type FavoriteMatchLevel = "recommended" | "best" | null;

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  tags: IngredientTag[];
  suitableSlots: MealComponentSlot[];
  mealAffinity: Partial<Record<MealType, number>>;
};

export type FavoriteEntry = {
  entryId: string;
  ingredientId: string;
  mealType: MealType;
  slot: MealComponentSlot;
  isAllergic: boolean;
};

export type IngredientFilterId =
  | "all"
  | "vege"
  | "posno"
  | "vegan"
  | "meso"
  | "mlecno"
  | "gluten_free";

export type AiRecommendation = {
  mealName: string;
  reason: string;
  confidence: "Visoka" | "Srednja" | "Umerena";
  suggestedObrok: MealType;
  matchedIngredients: string[];
  matchedBySlot: Partial<Record<MealComponentSlot, string[]>>;
  composedMenu: Partial<Record<MealComponentSlot, string>>;
  composedMenuPrices: Partial<Record<MealComponentSlot, number>>;
  image: string;
  price: number;
  selectedDishIds?: Partial<Record<CreatorSlotId, string>>;
};

export const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];

export const mealComponentSlots: { id: MealComponentSlot; label: string }[] = [
  { id: "glavno_jelo", label: "Glavno jelo" },
  { id: "dodatak", label: "Dodatak" },
  { id: "salata", label: "Salata" },
  { id: "dezert", label: "Dezert" },
];

export const mealComponentSlotLabels: Record<MealComponentSlot, string> = {
  glavno_jelo: "Glavno jelo",
  dodatak: "Dodatak",
  salata: "Salata",
  dezert: "Dezert",
};

export function getMealComponentSlotPrices(): Record<MealComponentSlot, number> {
  return getMealPrices().slotPrices;
}

export const mealComponentSlotPrices: Record<MealComponentSlot, number> = {
  glavno_jelo: 70,
  dodatak: 50,
  salata: 40,
  dezert: 40,
};

export const ingredientFilters: { id: IngredientFilterId; label: string }[] = [
  { id: "all", label: "Sve" },
  { id: "vege", label: "Vege" },
  { id: "posno", label: "Posno" },
  { id: "vegan", label: "Vegan" },
  { id: "meso", label: "Meso" },
  { id: "mlecno", label: "Mlečno" },
  { id: "gluten_free", label: "Bez glutena" },
];

export const mealTypeFilters: { id: MealType; label: string; short: string; color: string }[] = [
  { id: "breakfast", label: "Doručak", short: "D", color: "var(--meal-breakfast)" },
  { id: "lunch", label: "Ručak", short: "R", color: "var(--meal-lunch)" },
  { id: "dinner", label: "Večera", short: "V", color: "var(--meal-dinner)" },
];

export const ingredientTagLabels: Record<IngredientTag, string> = {
  vege: "Vege",
  posno: "Posno",
  vegan: "Vegan",
  meso: "Meso",
  mlecno: "Mlečno",
  gluten_free: "Bez glutena",
};

const defaultAffinity: Partial<Record<MealType, number>> = {
  breakfast: 1,
  lunch: 2,
  dinner: 1,
};

export const allIngredients: Ingredient[] = [
  { id: "brokoli", name: "Brokoli", category: "Povrće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["glavno_jelo", "salata", "dodatak"], mealAffinity: { lunch: 3, dinner: 2 } },
  { id: "pirinc", name: "Pirinač", category: "Žitarice", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["dodatak", "glavno_jelo"], mealAffinity: { lunch: 3, dinner: 2 } },
  { id: "soja", name: "Soja", category: "Mahunarke", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["glavno_jelo", "dodatak"], mealAffinity: { lunch: 2, dinner: 2 } },
  { id: "tofu", name: "Tofu", category: "Mahunarke", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["glavno_jelo", "dodatak"], mealAffinity: { lunch: 2, dinner: 3 } },
  { id: "jaja", name: "Jaja", category: "Mlečno", tags: ["mlecno", "gluten_free"], suitableSlots: ["glavno_jelo", "dezert"], mealAffinity: { breakfast: 3, lunch: 1 } },
  { id: "pilece", name: "Pileće meso", category: "Meso", tags: ["meso", "gluten_free"], suitableSlots: ["glavno_jelo"], mealAffinity: { lunch: 3, dinner: 2 } },
  { id: "svinjsko", name: "Svinjsko meso", category: "Meso", tags: ["meso"], suitableSlots: ["glavno_jelo"], mealAffinity: { lunch: 3, dinner: 2 } },
  { id: "junetina", name: "Junetina", category: "Meso", tags: ["meso"], suitableSlots: ["glavno_jelo"], mealAffinity: { lunch: 3, dinner: 2 } },
  { id: "krompir", name: "Krompir", category: "Povrće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["dodatak", "glavno_jelo"], mealAffinity: { lunch: 2, dinner: 2 } },
  { id: "pasulj", name: "Pasulj", category: "Mahunarke", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["glavno_jelo", "dodatak"], mealAffinity: { lunch: 3, dinner: 1 } },
  { id: "luk", name: "Luk", category: "Povrće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["dodatak", "salata"], mealAffinity: defaultAffinity },
  { id: "paradajz", name: "Paradajz", category: "Povrće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["salata", "dodatak"], mealAffinity: { lunch: 2, dinner: 2 } },
  { id: "paprika", name: "Paprika", category: "Povrće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["salata", "dodatak", "glavno_jelo"], mealAffinity: { lunch: 2, dinner: 2 } },
  { id: "mleko", name: "Mleko", category: "Mlečno", tags: ["mlecno", "gluten_free"], suitableSlots: ["dezert", "dodatak"], mealAffinity: { breakfast: 3 } },
  { id: "sir", name: "Sir", category: "Mlečno", tags: ["mlecno", "gluten_free"], suitableSlots: ["dodatak", "dezert"], mealAffinity: { breakfast: 2, lunch: 1 } },
  { id: "jogurt", name: "Jogurt", category: "Mlečno", tags: ["mlecno", "gluten_free"], suitableSlots: ["dezert", "dodatak"], mealAffinity: { breakfast: 3, dinner: 1 } },
  { id: "testenina", name: "Testenina", category: "Žitarice", tags: ["vege"], suitableSlots: ["dodatak", "glavno_jelo"], mealAffinity: { lunch: 3, dinner: 2 } },
  { id: "hleb", name: "Hleb", category: "Žitarice", tags: ["vege"], suitableSlots: ["dodatak"], mealAffinity: { breakfast: 3, lunch: 1 } },
  { id: "kupus", name: "Kupus", category: "Povrće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["salata", "dodatak"], mealAffinity: { lunch: 2, dinner: 2 } },
  { id: "jabuka", name: "Jabuka", category: "Voće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["dezert", "salata"], mealAffinity: { breakfast: 2, dinner: 2 } },
  { id: "banana", name: "Banana", category: "Voće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["dezert"], mealAffinity: { breakfast: 3 } },
  { id: "losos", name: "Losos", category: "Meso", tags: ["posno", "gluten_free"], suitableSlots: ["glavno_jelo"], mealAffinity: { lunch: 2, dinner: 3 } },
  { id: "tuna", name: "Tuna", category: "Meso", tags: ["posno", "gluten_free"], suitableSlots: ["glavno_jelo", "salata"], mealAffinity: { lunch: 2, dinner: 2 } },
  { id: "spanska", name: "Španać", category: "Povrće", tags: ["vege", "posno", "vegan", "gluten_free"], suitableSlots: ["salata", "dodatak"], mealAffinity: { lunch: 2, dinner: 2 } },
];

let entryCounter = 0;

function createEntryId() {
  entryCounter += 1;
  return `fav-${entryCounter}`;
}

export const initialFavorites: FavoriteEntry[] = [
  { entryId: "fav-1", ingredientId: "jaja", mealType: "breakfast", slot: "glavno_jelo", isAllergic: false },
  { entryId: "fav-2", ingredientId: "hleb", mealType: "breakfast", slot: "dodatak", isAllergic: false },
  { entryId: "fav-3", ingredientId: "banana", mealType: "breakfast", slot: "dezert", isAllergic: false },
  { entryId: "fav-4", ingredientId: "pilece", mealType: "lunch", slot: "glavno_jelo", isAllergic: false },
  { entryId: "fav-5", ingredientId: "pirinc", mealType: "lunch", slot: "dodatak", isAllergic: false },
  { entryId: "fav-6", ingredientId: "brokoli", mealType: "lunch", slot: "salata", isAllergic: false },
  { entryId: "fav-6b", ingredientId: "jabuka", mealType: "lunch", slot: "dezert", isAllergic: false },
  { entryId: "fav-7", ingredientId: "losos", mealType: "dinner", slot: "glavno_jelo", isAllergic: false },
  { entryId: "fav-8", ingredientId: "krompir", mealType: "dinner", slot: "dodatak", isAllergic: false },
  { entryId: "fav-9", ingredientId: "spanska", mealType: "dinner", slot: "salata", isAllergic: false },
  { entryId: "fav-9b", ingredientId: "jogurt", mealType: "dinner", slot: "dezert", isAllergic: false },
];

const defaultMealImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBetAAxPDFoAwyj39KbGs-WY3KcbOJtwNyHxBNUSBEldKIOeQhN_Nn4Ypkj-IWMrCQslLJ1jpG17RExM2S7Zj1kyJLyDC0JdU0krXbvaAKhSRDdHFN99CXo2jkRom2PUNPZd3yblKxX8tIJlusjc7JsAvSfIEPziEBWrJFGTE9B2aoAy1F4PsBVHA-G8AaRhLZy__8UF6m8zx_u6ttAyOKdCI9MMsOSGWn2l51RnPirOhahIg2D5bJLY3lrUfatIFTuPN4fEWOiXs0";

const extraMealRecommendations: {
  mealName: string;
  ingredientIds: string[];
  image: string;
  price: number;
  reasonTemplate: string;
}[] = [
  {
    mealName: "Pirinač sa povrćem",
    ingredientIds: ["pirinc", "brokoli", "paprika", "soja"],
    image: defaultMealImage,
    price: 70,
    reasonTemplate: "Kombinacija pirinča i povrća odgovara vašim omiljenim namirnicama.",
  },
  {
    mealName: "Tofu wok sa sojom",
    ingredientIds: ["tofu", "soja", "paprika", "luk"],
    image: defaultMealImage,
    price: 70,
    reasonTemplate: "Posno i vegansko jelo sa namirnicama koje ste označili kao omiljene.",
  },
  {
    mealName: "Pileći file sa krompirom",
    ingredientIds: ["pilece", "krompir", "paprika"],
    image: defaultMealImage,
    price: 70,
    reasonTemplate: "Proteinski obrok sa povrćem koje volite.",
  },
];

const recommendationSlotMap: Record<MealComponentSlot, CreatorSlotId> = {
  glavno_jelo: "main",
  dodatak: "side",
  salata: "salad",
  dezert: "dessert",
};

const rpcSlotMap: Record<AiRecommendationRpcRow["slot_id"], MealComponentSlot> = {
  main: "glavno_jelo",
  side: "dodatak",
  salad: "salata",
  dessert: "dezert",
};

export function getIngredientById(id: string): Ingredient | undefined {
  return allIngredients.find((item) => item.id === id);
}

export function getInitialFavorites(): FavoriteEntry[] {
  return initialFavorites.map((entry) => ({ ...entry }));
}

export function createFavoriteEntry(
  ingredientId: string,
  mealType: MealType,
  slot: MealComponentSlot,
  isAllergic: boolean,
): FavoriteEntry {
  return {
    entryId: createEntryId(),
    ingredientId,
    mealType,
    slot,
    isAllergic,
  };
}

export type ResolvedFavoriteEntry = FavoriteEntry & { ingredient: Ingredient };

export function resolveFavorites(entries: FavoriteEntry[]): ResolvedFavoriteEntry[] {
  return entries
    .map((entry) => {
      const ingredient = getIngredientById(entry.ingredientId);
      if (!ingredient) {
        return null;
      }
      return { ...entry, ingredient };
    })
    .filter((item): item is ResolvedFavoriteEntry => Boolean(item));
}

export function getFavoritesForMeal(entries: FavoriteEntry[], mealType: MealType) {
  return entries.filter((entry) => entry.mealType === mealType);
}

export function getFavoritesForMealSlot(
  entries: FavoriteEntry[],
  mealType: MealType,
  slot: MealComponentSlot,
) {
  return entries.filter((entry) => entry.mealType === mealType && entry.slot === slot);
}

export function isMealRanked(entries: FavoriteEntry[], mealType: MealType) {
  return getFavoritesForMeal(entries, mealType).length > 0;
}

export function areAllMealsRanked(entries: FavoriteEntry[]) {
  return mealTypes.every((mealType) => isMealRanked(entries, mealType));
}

export function getMealRankingStatus(entries: FavoriteEntry[]) {
  return Object.fromEntries(
    mealTypes.map((mealType) => [mealType, isMealRanked(entries, mealType)]),
  ) as Record<MealType, boolean>;
}

export function moveFavoriteEntry(
  entries: FavoriteEntry[],
  entryId: string,
  direction: "up" | "down",
) {
  const index = entries.findIndex((entry) => entry.entryId === entryId);
  if (index < 0) {
    return entries;
  }

  const entry = entries[index];
  const slotEntries = entries.filter(
    (item) => item.mealType === entry.mealType && item.slot === entry.slot,
  );
  const slotIndex = slotEntries.findIndex((item) => item.entryId === entryId);
  const targetSlotIndex = direction === "up" ? slotIndex - 1 : slotIndex + 1;

  if (targetSlotIndex < 0 || targetSlotIndex >= slotEntries.length) {
    return entries;
  }

  const swapEntry = slotEntries[targetSlotIndex];
  const swapIndex = entries.findIndex((item) => item.entryId === swapEntry.entryId);
  const next = [...entries];
  [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  return next;
}

export function filterIngredients(
  ingredients: Ingredient[],
  search: string,
  activeFilters: IngredientFilterId[],
  activeSlot?: MealComponentSlot,
): Ingredient[] {
  const normalizedSearch = search.trim().toLowerCase();
  const tagFilters = activeFilters.filter((filter) => filter !== "all");

  return ingredients.filter((ingredient) => {
    const matchesSearch =
      !normalizedSearch ||
      ingredient.name.toLowerCase().includes(normalizedSearch) ||
      ingredient.category.toLowerCase().includes(normalizedSearch);

    const matchesTags =
      tagFilters.length === 0 ||
      tagFilters.every((filter) => ingredient.tags.includes(filter as IngredientTag));

    const matchesSlot = !activeSlot || ingredient.suitableSlots.includes(activeSlot);

    return matchesSearch && matchesTags && matchesSlot;
  });
}

export function getFavoriteMatchLevels(
  favorites: FavoriteEntry[],
  obrok: MealType,
  recommendation?: AiRecommendation | null,
): Record<string, FavoriteMatchLevel> {
  const mealFavorites = resolveFavorites(getFavoritesForMeal(favorites, obrok));
  const levels: Record<string, FavoriteMatchLevel> = {};

  for (const entry of mealFavorites) {
    levels[entry.entryId] = null;
  }

  if (recommendation) {
    for (const entry of mealFavorites) {
      if (recommendation.matchedIngredients.includes(entry.ingredient.name)) {
        levels[entry.entryId] = "recommended";
      }
    }
  }

  for (const slot of mealComponentSlots) {
    const slotEntries = mealFavorites.filter((entry) => entry.slot === slot.id);
    if (slotEntries.length === 0) {
      continue;
    }

    const top = slotEntries[0];
    if (top && levels[top.entryId] !== "recommended") {
      levels[top.entryId] = "best";
    }
  }

  return levels;
}

function scoreMeal(mealIngredientIds: string[], favoriteIds: string[]) {
  const matched = mealIngredientIds.filter((id) => favoriteIds.includes(id));
  return { score: matched.length, matched };
}

function isPosnoIngredientId(ingredientId: string) {
  return allIngredients.find((item) => item.id === ingredientId)?.tags.includes("posno") ?? false;
}

function getTopPickForSlot(
  favorites: FavoriteEntry[],
  obrok: MealType,
  slot: MealComponentSlot,
  preferPosno = false,
) {
  const entries = resolveFavorites(getFavoritesForMealSlot(favorites, obrok, slot)).filter(
    (entry) => !entry.isAllergic,
  );

  if (preferPosno) {
    return entries.find((entry) => isPosnoIngredientId(entry.ingredientId));
  }

  return entries[0];
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj");
}

function scoreMenuOption(option: MealOption, favorites: ResolvedFavoriteEntry[]) {
  const optionText = normalizeMatchText(`${option.name} ${option.category} ${option.badges.join(" ")}`);
  let score = 0;
  const matched: string[] = [];

  favorites.forEach((favorite, index) => {
    const ingredientText = normalizeMatchText(favorite.ingredient.name);
    const tagMatch = favorite.ingredient.tags.some((tag) => option.badges.includes(tag));

    if (optionText.includes(ingredientText)) {
      score += 100 - index;
      matched.push(favorite.ingredient.name);
      return;
    }

    if (tagMatch) {
      score += 8;
    }
  });

  if (option.disabled || option.stock <= 0) {
    score -= 1000;
  }

  return { score, matched };
}

function getRecommendedMenuOption(
  favorites: FavoriteEntry[],
  obrok: MealType,
  slot: MealComponentSlot,
  dateKey: string | undefined,
  preferPosno: boolean,
) {
  if (!dateKey) {
    return null;
  }

  const options = getPublishedMenuOptions(dateKey, obrok)?.[recommendationSlotMap[slot]] ?? [];
  if (options.length === 0) {
    return null;
  }

  const slotFavorites = resolveFavorites(getFavoritesForMealSlot(favorites, obrok, slot)).filter(
    (entry) => !entry.isAllergic,
  );
  const preferredFavorites = preferPosno
    ? slotFavorites.filter((entry) => entry.ingredient.tags.includes("posno"))
    : slotFavorites;
  const favoritesForScoring = preferredFavorites.length > 0 ? preferredFavorites : slotFavorites;

  const scored = options
    .map((option, index) => ({
      option,
      index,
      ...scoreMenuOption(option, favoritesForScoring),
    }))
    .filter((item) => item.score > -1000)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const best = scored[0];
  if (!best) {
    return null;
  }

  return {
    option: best.option,
    matched:
      best.matched.length > 0
        ? best.matched
        : favoritesForScoring.slice(0, 1).map((entry) => entry.ingredient.name),
  };
}

export function canGenerateRecommendation(favorites: FavoriteEntry[], obrok: MealType) {
  return mealComponentSlots.some((slot) => Boolean(getTopPickForSlot(favorites, obrok, slot.id)));
}

export function generateMockRecommendation(
  favorites: FavoriteEntry[],
  obrok: MealType,
  dateKey?: string,
  seed = 0,
  preferPosno = false,
): AiRecommendation | null {
  if (dateKey && !isDailyMenuPublished(dateKey, obrok)) {
    return null;
  }

  const mealLabel = mealTypeFilters.find((item) => item.id === obrok)?.label ?? "Obrok";
  const composedMenu: Partial<Record<MealComponentSlot, string>> = {};
  const composedMenuPrices: Partial<Record<MealComponentSlot, number>> = {};
  const matchedBySlot: Partial<Record<MealComponentSlot, string[]>> = {};

  for (const slot of mealComponentSlots) {
    const menuPick = getRecommendedMenuOption(favorites, obrok, slot.id, dateKey, preferPosno);
    if (menuPick) {
      composedMenu[slot.id] = menuPick.option.name;
      composedMenuPrices[slot.id] = menuPick.option.price;
      matchedBySlot[slot.id] = menuPick.matched;
      continue;
    }

    const topPick = getTopPickForSlot(favorites, obrok, slot.id, preferPosno);
    if (topPick) {
      composedMenu[slot.id] = topPick.ingredient.name;
      composedMenuPrices[slot.id] = getMealComponentSlotPrices()[slot.id];
      matchedBySlot[slot.id] = [topPick.ingredient.name];
    }
  }

  const filledSlots = Object.keys(composedMenu).length;
  if (filledSlots === 0) {
    return null;
  }

  const matchedIngredients = Object.values(matchedBySlot).flat();
  const slotDescriptions = mealComponentSlots
    .filter((slot) => composedMenu[slot.id])
    .map((slot) => `${slot.label.toLowerCase()}: ${composedMenu[slot.id]}`);

  const glavno = composedMenu.glavno_jelo;
  const mealName = glavno
    ? `${glavno} — ${mealLabel.toLowerCase()} po vašem ukusu`
    : `Personalizovan ${mealLabel.toLowerCase()}`;

  const reason = `Na osnovu rangiranih omiljenih namirnica predlažemo kompletan obrok — ${slotDescriptions.join(", ")}.`;

  const confidence: AiRecommendation["confidence"] =
    filledSlots >= 4 ? "Visoka" : filledSlots >= 2 ? "Srednja" : "Umerena";

  const resolved = resolveFavorites(getFavoritesForMeal(favorites, obrok)).filter(
    (entry) => !entry.isAllergic,
  );
  const favoriteIds = resolved.map((entry) => entry.ingredientId);

  const allowedMainDishes = dateKey
    ? new Set(getPublishedMenuOptions(dateKey, obrok)?.main.map((meal) => meal.name) ?? [])
    : null;

  const kreatorCandidates = getKreatorObrokaMealOptions()
    .filter((meal) => !meal.disabled)
    .filter((meal) => !allowedMainDishes || allowedMainDishes.has(meal.name))
    .map((meal) => ({
      mealName: meal.name,
      ingredientIds:
        meal.name.includes("Pileći")
          ? ["pilece", "krompir"]
          : meal.name.includes("Bečka")
            ? ["svinjsko", "krompir"]
            : ["pasulj", "krompir"],
      image: meal.image,
      price: meal.price,
    }));

  const posnoFilter = <T extends { ingredientIds: string[] }>(items: T[]) =>
    preferPosno
      ? items.filter((item) => item.ingredientIds.every((id) => isPosnoIngredientId(id)))
      : items;

  const allCandidates = [
    ...posnoFilter(extraMealRecommendations),
    ...posnoFilter(kreatorCandidates),
  ];
  const scored = allCandidates
    .map((candidate) => ({
      candidate,
      score: scoreMeal(candidate.ingredientIds, favoriteIds).score,
    }))
    .sort((a, b) => b.score - a.score);

  const pickIndex = (scored.length + seed) % Math.max(scored.length, 1);
  const mainOptions = getKreatorObrokaMealOptions();
  const imageSource = scored[pickIndex]?.candidate ?? mainOptions[0];

  const slotPrices = getMealComponentSlotPrices();

  const price = mealComponentSlots.reduce(
    (sum, slot) => sum + (composedMenu[slot.id] ? slotPrices[slot.id] : 0),
    0,
  );

  return {
    mealName,
    reason,
    confidence,
    suggestedObrok: obrok,
    matchedIngredients,
    matchedBySlot,
    composedMenu,
    composedMenuPrices,
    image: imageSource.image,
    price: price || imageSource.price,
  };
}

export function buildRecommendationFromRpcRows(
  rows: AiRecommendationRpcRow[],
  obrok: MealType,
): AiRecommendation | null {
  if (rows.length === 0) {
    return null;
  }

  const composedMenu: Partial<Record<MealComponentSlot, string>> = {};
  const composedMenuPrices: Partial<Record<MealComponentSlot, number>> = {};
  const matchedBySlot: Partial<Record<MealComponentSlot, string[]>> = {};

  rows.forEach((row) => {
    const slot = rpcSlotMap[row.slot_id];
    composedMenu[slot] = row.dish_name;
    composedMenuPrices[slot] = row.price_rsd;
    matchedBySlot[slot] = [row.dish_name];
  });

  const mainDish = composedMenu.glavno_jelo ?? rows[0]?.dish_name ?? "AI preporuka";
  const mealLabel = mealTypeFilters.find((item) => item.id === obrok)?.label ?? "Obrok";
  const price = rows.reduce((sum, row) => sum + Number(row.price_rsd || 0), 0);
  const reason = rows[0]?.reason ?? "Preporuka je izabrana iz dostupnog jelovnika.";
  const matchedIngredients = rows.map((row) => row.dish_name);
  const filledSlots = rows.length;

  return {
    mealName: `${mainDish} — ${mealLabel.toLowerCase()} po vašoj listi želja`,
    reason,
    confidence: filledSlots >= 4 ? "Visoka" : filledSlots >= 2 ? "Srednja" : "Umerena",
    suggestedObrok: obrok,
    matchedIngredients,
    matchedBySlot,
    composedMenu,
    composedMenuPrices,
    image: defaultMealImage,
    price,
  };
}

export function getAiPreporukaHref(params?: { obrok?: MealType }) {
  if (!params?.obrok) {
    return "/ai-preporuka";
  }

  return `/ai-preporuka?obrok=${params.obrok}`;
}

export function parseAiPreporukaObrok(value: string | null): MealType | null {
  return parseKreatorObrokaObrok(value);
}

export const DSH_PRIORITY_SLOT_ORDER: CreatorSlotId[] = ["main", "side", "dessert", "salad"];

export function generateDishRecommendation(params: {
  wishlist: DishWishlist;
  obrok: MealType;
  dateKey: string;
  balanceRsd: number;
  preferPosno: boolean;
  forceNonPosno: boolean;
  mainDishSkipCount?: number;
}): AiRecommendation | null {
  const { wishlist, obrok, dateKey, balanceRsd, preferPosno, forceNonPosno, mainDishSkipCount = 0 } = params;

  if (dateKey && !isDailyMenuPublished(dateKey, obrok)) {
    return null;
  }

  if (dateKey && !isMealTypeInWorkingHours(dateKey, obrok)) {
    return null;
  }

  const menuOptions = dateKey ? getPublishedMenuOptions(dateKey, obrok) : null;
  if (!menuOptions) {
    return null;
  }

  const composedMenu: Partial<Record<MealComponentSlot, string>> = {};
  const composedMenuPrices: Partial<Record<MealComponentSlot, number>> = {};
  const matchedBySlot: Partial<Record<MealComponentSlot, string[]>> = {};
  const selectedDishIds: Partial<Record<CreatorSlotId, string>> = {};
  let totalSpent = 0;

  for (const slotId of DSH_PRIORITY_SLOT_ORDER) {
    const ranking = wishlist[slotId] ?? [];
    const slotOptions = menuOptions[slotId] ?? [];

    if (ranking.length === 0) continue;

    const shouldFilterPosno = preferPosno && !forceNonPosno;

    let bestOption: MealOption | null = null;
    let bestDishId: string | undefined;
    let skipLeft = slotId === "main" ? mainDishSkipCount : 0;

    for (const ranked of ranking) {
      const option = slotOptions.find((o) => o.id === ranked.dishId);
      if (!option) continue;
      if (option.disabled || option.stock <= 0) continue;
      if (shouldFilterPosno && !option.badges.includes("posno")) continue;
      if (balanceRsd < totalSpent + option.price) continue;

      if (skipLeft > 0) {
        skipLeft--;
        continue;
      }

      bestOption = option;
      bestDishId = ranked.dishId;
      break;
    }

    if (!bestOption) continue;

    const mealSlot = Object.entries(recommendationSlotMap).find(
      ([, v]) => v === slotId,
    )?.[0] as MealComponentSlot | undefined;

    if (!mealSlot) continue;

    composedMenu[mealSlot] = bestOption.name;
    composedMenuPrices[mealSlot] = bestOption.price;
    matchedBySlot[mealSlot] = [bestOption.name];
    selectedDishIds[slotId] = bestDishId;
    totalSpent += bestOption.price;
  }

  const filledSlots = Object.keys(composedMenu).length;
  if (filledSlots === 0) {
    return null;
  }

  const matchedIngredients = Object.values(matchedBySlot).flat();
  const slotDescriptions = mealComponentSlots
    .filter((slot) => composedMenu[slot.id])
    .map((slot) => `${slot.label.toLowerCase()}: ${composedMenu[slot.id]}`);

  const glavno = composedMenu.glavno_jelo;
  const mealName = glavno
    ? `${glavno} — ${mealTypeFilters.find((item) => item.id === obrok)?.label?.toLowerCase() ?? "obrok"} po vašoj listi želja`
    : `Personalizovan ${mealTypeFilters.find((item) => item.id === obrok)?.label?.toLowerCase() ?? "obrok"}`;

  const mainRanking = wishlist.main ?? [];
  const mainDishId = selectedDishIds.main;
  const mainRank = mainDishId
    ? mainRanking.findIndex((r) => r.dishId === mainDishId) + 1
    : 0;

  const reason = mainRank > 0
    ? `Preporučeno jer je na ${mainRank}. mestu tvoje liste želja`
    : `Preporuka na osnovu tvoje liste želja — ${slotDescriptions.join(", ")}.`;

  const confidence: AiRecommendation["confidence"] =
    filledSlots >= 4 ? "Visoka" : filledSlots >= 2 ? "Srednja" : "Umerena";

  const mainDishImage = mainDishId
    ? getDishById(mainDishId)?.imageUrl ?? defaultMealImage
    : defaultMealImage;

  return {
    mealName,
    reason,
    confidence,
    suggestedObrok: obrok,
    matchedIngredients,
    matchedBySlot,
    composedMenu,
    composedMenuPrices,
    selectedDishIds,
    image: mainDishImage,
    price: totalSpent,
  };
}

export const mealSlotLabels: Record<MealType, { label: string; short: string; color: string }> = {
  breakfast: { label: "Doručak", short: "D", color: "var(--meal-breakfast)" },
  lunch: { label: "Ručak", short: "R", color: "var(--meal-lunch)" },
  dinner: { label: "Večera", short: "V", color: "var(--meal-dinner)" },
};
