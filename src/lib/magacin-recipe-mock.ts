import {
  ingredientUnitLabels,
  type IngredientUnit,
} from "@/lib/magacin-mock";
import type { MealType } from "@/lib/meal-types";

/**
 * "Spisak" – recept po jelu. Recept se identifikuje po IMENU jela (jer
 * rezervacije čuvaju imena jela kao tekst, a ne ID-jeve).
 *
 * Za glavne sirovine (ingredientType === "main") kuvar unosi tačnu potrošnju
 * po OBROKU (perServing) u jedinici namirnice (kg, g, l, kom).
 * Za rezijske namirnice (ingredientType === "overhead") kuvar samo označi da li
 * se namirnica koristi u jelu (used true/false).
 */
export type DishRecipeEntry = {
  id: string;
  ingredientId?: string;
  ingredientName: string;
  unit: IngredientUnit;
  /** Potrošnja po jednom obroku/jelu – koristi se za "main" namirnice. */
  perServing: number;
  /** Da li se namirnica koristi u jelu – koristi se za "overhead" namirnice. */
  used: boolean;
};

export type DishRecipe = {
  dishName: string;
  entries: DishRecipeEntry[];
  updatedAt: string;
  /** Ukupna masa cele porcije jela u gramima (ručno uneta). */
  totalGramsPerPortion?: number;
};

export type RecipeState = {
  recipes: DishRecipe[];
  /** Datumi za koje je potrošnja već primenjena (oduzeta sa zalihe). */
  appliedDates: string[];
};

export const magacinRecipeStorageKey = "emenza-magacin-recipe";
export const magacinRecipeDemoVersion = 1;

/** Tražnja: koliko obroka (servinga) je naručeno po jelu za izabrani dan. */
export type DishDemand = {
  dishName: string;
  servings: number;
};

export type IngredientConsumption = {
  ingredientId?: string;
  ingredientName: string;
  unit: IngredientUnit;
  ingredientType: "main" | "overhead";
  currentStock: number;
  minStock: number;
  /** Ukupno potrebno po obroku za sva jela koja je koriste (main). */
  perServingTotal: number;
  /** Broj obroka koji su tražili ovo jelo (main). */
  servingsOrdered: number;
  /** main: needed = perServingTotal * servingsOrdered. */
  neededThisMenu: number;
  /** Koristi se u bilo kom jelu koje je poručeno (overhead) ili ima potrošnju (main). */
  usedInOrderedMenu: boolean;
  /** main: currentStock - neededThisMenu (može biti negativno). */
  remainingAfterMenu: number;
  /** Koliko još obroka se može spremiti sa tom namirnicom. */
  servingsPossible: number;
  /** Da li je potrošnja već primenjena (oduzeta sa zalihe). */
  applied: boolean;
  /** Ručna korekcija zalihe zbog greške. */
  correction: number;
  /** Koristi se u bilo kom unosu spiska uopšte (bez obzira na rezervacije). */
  usedInAnyRecipe: boolean;
};

export type ConsumptionPlan = {
  dateKey: string;
  mealType: MealType;
  demand: DishDemand[];
  ingredients: IngredientConsumption[];
  /** Da li je meni (potrošnja) traženog dana uopšte primenjen. */
  appliedAt?: string;
  totalServings: number;
};

export const recipeMealTypeLabels: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

export function idForEntry(dishName: string, ingredientName: string): string {
  return `re-${slugifyId(dishName)}-${slugifyId(ingredientName)}`;
}

export function cloneRecipeState(state: RecipeState): RecipeState {
  return structuredClone(state);
}

export function getRecipeForDish(
  state: RecipeState,
  dishName: string,
): DishRecipe | undefined {
  return state.recipes.find(
    (r) => r.dishName.toLowerCase() === dishName.toLowerCase(),
  );
}

/**
 * Računa: za rezijske namirnice se ne unosi količina, pa "koliko još jela
 * može da se spremi" zavisno od ograničavajuće glavne sirovine. Za rezijske
 * namirnice prikazujemo samo indikaciju da li nedostaju (currentStock < minStock
 * ili se potpuno potrošilo) i koliko dana/menija pokrivaju u proseku.
 */
export function computeServingsPossible(
  ingredientType: "main" | "overhead",
  currentStock: number,
  perServingTotal: number,
): number {
  if (perServingTotal <= 0) {
    return currentStock > 0 ? Infinity : 0;
  }
  return Math.floor(currentStock / perServingTotal);
}

function slugifyId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/\u200b/g, "");
}

const seedTimestamp = "2026-03-01T08:00:00.000Z";

function entry(
  ingredientName: string,
  unit: IngredientUnit,
  perServing: number,
  used: boolean,
): DishRecipeEntry {
  return {
    id: idForEntry("", ingredientName),
    ingredientName,
    unit,
    perServing,
    used,
  };
}

function recipe(dishName: string, entries: DishRecipeEntry[]): DishRecipe {
  return { dishName, entries, updatedAt: seedTimestamp };
}

/**
 * Demo spisak za glavna jela iz jelovnika, povezana sa demo namirnicama iz
 * magacina (po imenu).
 */
const seedRecipes: DishRecipe[] = [
  recipe("Pileći file", [
    entry("Pileći file", "kg", 0.18, false),
    entry("Ulje", "l", 0, true),
    entry("So", "kg", 0, true),
    entry("Krompir", "kg", 0.25, false),
    entry("Šargarepa", "kg", 0.05, false),
  ]),
  recipe("Bečka šnicla", [
    entry("Svinjsko meso", "kg", 0.15, false),
    entry("Jaja", "kom", 1, false),
    entry("Brašno", "kg", 0, true),
    entry("Ulje", "l", 0, true),
    entry("Krompir", "kg", 0.25, false),
    entry("So", "kg", 0, true),
  ]),
  recipe("Gulaš", [
    entry("Svinjsko meso", "kg", 0.2, false),
    entry("Luk", "kg", 0.08, false),
    entry("Paradajz", "kg", 0.06, false),
    entry("Šargarepa", "kg", 0.04, false),
    entry("Ulje", "l", 0, true),
    entry("So", "kg", 0, true),
    entry("Pirinac", "kg", 0.12, false),
  ]),
  recipe("Pasulj prebranac", [
    entry("Pasulj", "kg", 0.12, false),
    entry("Luk", "kg", 0.04, false),
    entry("Ulje", "l", 0, true),
    entry("So", "kg", 0, true),
  ]),
  recipe("Rižoto sa pečurkama", [
    entry("Pirinac", "kg", 0.12, false),
    entry("Sir", "kg", 0.03, false),
    entry("Šargarepa", "kg", 0.03, false),
    entry("Ulje", "l", 0, true),
    entry("So", "kg", 0, true),
  ]),
  recipe("Pirinač", [
    entry("Pirinac", "kg", 0.12, false),
    entry("Ulje", "l", 0, true),
    entry("So", "kg", 0, true),
  ]),
  recipe("Krompir", [
    entry("Krompir", "kg", 0.25, false),
    entry("So", "kg", 0, true),
    entry("Ulje", "l", 0, true),
  ]),
  recipe("Pire", [
    entry("Krompir", "kg", 0.25, false),
    entry("Mleko", "l", 0.1, false),
    entry("So", "kg", 0, true),
    entry("Ulje", "l", 0, true),
  ]),
  recipe("Integralni hleb", [
    entry("Integralni hleb", "kom", 1, false),
  ]),
];

export function createInitialRecipeState(): RecipeState {
  return {
    appliedDates: [],
    recipes: seedRecipes.map((r) => ({
      ...r,
      entries: r.entries.map((e) => ({
        ...e,
        id: idForEntry(r.dishName, e.ingredientName),
      })),
    })),
  };
}

export function ingredientUnitLabel(unit: IngredientUnit): string {
  return ingredientUnitLabels[unit];
}
