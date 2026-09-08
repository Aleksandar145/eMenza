export type IngredientCategory =
  | "meso"
  | "povrce"
  | "voce"
  | "mlecni"
  | "pekara"
  | "zimnica"
  | "konditor"
  | "beverages"
  | "ostalo";

export type IngredientUnit = "kg" | "g" | "l" | "kom" | "pak";

export type IngredientType = "main" | "overhead";

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  ingredientType: IngredientType;
  currentStock: number;
  minStock: number;
  createdAt: string;
  updatedAt: string;
};

export type ProcurementReportItem = {
  id: string;
  ingredientId?: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  amountRsd: number;
};

export type ReportStatus = "draft" | "finalized";

export type ProcurementReport = {
  id: string;
  dateKey: string;
  label: string;
  supplier?: string;
  status: ReportStatus;
  items: ProcurementReportItem[];
  totalRsd: number;
  createdBy: string;
  createdAt: string;
  finalizedAt?: string;
};

export type MagacinState = {
  ingredients: Ingredient[];
  reports: ProcurementReport[];
};

export const magacinStorageKey = "emenza-magacin";
export const magacinDemoVersion = 3;

export const ingredientCategoryLabels: Record<IngredientCategory, string> = {
  meso: "Meso",
  povrce: "Povrće",
  voce: "Voće",
  mlecni: "Mlečni proizvodi",
  pekara: "Pekara",
  zimnica: "Osnovne namirnice",
  konditor: "Konditorski proizvodi",
  beverages: "Pića",
  ostalo: "Ostalo",
};

export const ingredientCategoryOrder: IngredientCategory[] = [
  "meso",
  "povrce",
  "voce",
  "mlecni",
  "pekara",
  "zimnica",
  "konditor",
  "beverages",
  "ostalo",
];

export const ingredientUnitLabels: Record<IngredientUnit, string> = {
  kg: "kg",
  g: "g",
  l: "l",
  kom: "kom",
  pak: "pak",
};

export const ingredientTypeLabels: Record<IngredientType, string> = {
  main: "Glavne sirovine",
  overhead: "Rezijske namirnice",
};

type SeedIngredient = {
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  currentStock: number;
  minStock: number;
  ingredientType: IngredientType;
};

const seedTimestamp = "2026-01-01T08:00:00.000Z";

const seedIngredients: SeedIngredient[] = [
  { name: "Pileći file", category: "meso", unit: "kg", currentStock: 18, minStock: 10, ingredientType: "main" },
  { name: "Mleveno meso (junetina)", category: "meso", unit: "kg", currentStock: 7, minStock: 8, ingredientType: "main" },
  { name: "Svinjsko meso", category: "meso", unit: "kg", currentStock: 12, minStock: 8, ingredientType: "main" },
  { name: "Krompir", category: "povrce", unit: "kg", currentStock: 45, minStock: 20, ingredientType: "main" },
  { name: "Pirinac", category: "povrce", unit: "kg", currentStock: 30, minStock: 15, ingredientType: "main" },
  { name: "Paradajz", category: "povrce", unit: "kg", currentStock: 8, minStock: 10, ingredientType: "main" },
  { name: "Kupus", category: "povrce", unit: "kg", currentStock: 25, minStock: 10, ingredientType: "main" },
  { name: "Šargarepa", category: "povrce", unit: "kg", currentStock: 14, minStock: 6, ingredientType: "main" },
  { name: "Luk", category: "povrce", unit: "kg", currentStock: 20, minStock: 8, ingredientType: "main" },
  { name: "Salata zelena", category: "povrce", unit: "kom", currentStock: 30, minStock: 20, ingredientType: "main" },
  { name: "Mleko", category: "mlecni", unit: "l", currentStock: 40, minStock: 25, ingredientType: "main" },
  { name: "Kajmak", category: "mlecni", unit: "kg", currentStock: 6, minStock: 5, ingredientType: "main" },
  { name: "Sir", category: "mlecni", unit: "kg", currentStock: 11, minStock: 8, ingredientType: "main" },
  { name: "Jogurt", category: "mlecni", unit: "kom", currentStock: 120, minStock: 60, ingredientType: "main" },
  { name: "Jaja", category: "mlecni", unit: "kom", currentStock: 200, minStock: 120, ingredientType: "main" },
  { name: "Hleb", category: "pekara", unit: "kom", currentStock: 150, minStock: 80, ingredientType: "main" },
  { name: "Integralni hleb", category: "pekara", unit: "kom", currentStock: 40, minStock: 30, ingredientType: "main" },
  { name: "Peciva", category: "pekara", unit: "kom", currentStock: 90, minStock: 50, ingredientType: "main" },
  { name: "Brašno", category: "zimnica", unit: "kg", currentStock: 35, minStock: 20, ingredientType: "overhead" },
  { name: "Pasulj", category: "zimnica", unit: "kg", currentStock: 22, minStock: 10, ingredientType: "main" },
  { name: "So", category: "zimnica", unit: "kg", currentStock: 12, minStock: 6, ingredientType: "overhead" },
  { name: "Šećer", category: "zimnica", unit: "kg", currentStock: 18, minStock: 10, ingredientType: "overhead" },
  { name: "Ulje", category: "zimnica", unit: "l", currentStock: 28, minStock: 15, ingredientType: "overhead" },
  { name: "Jabuke", category: "voce", unit: "kg", currentStock: 16, minStock: 10, ingredientType: "main" },
  { name: "Banane", category: "voce", unit: "kg", currentStock: 12, minStock: 8, ingredientType: "main" },
  { name: "Čokolada", category: "konditor", unit: "kg", currentStock: 5, minStock: 4, ingredientType: "main" },
  { name: "Orašasti mix", category: "konditor", unit: "kg", currentStock: 6, minStock: 4, ingredientType: "main" },
  { name: "Sok od pomorandže", category: "beverages", unit: "l", currentStock: 30, minStock: 15, ingredientType: "main" },
  { name: "Voda", category: "beverages", unit: "l", currentStock: 60, minStock: 30, ingredientType: "main" },
];

export function createInitialMagacinState(): MagacinState {
  return {
    ingredients: seedIngredients.map((ing, i) => ({
      id: `ing-${i + 1}-${slugifyId(ing.name)}`,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      ingredientType: ing.ingredientType,
      currentStock: ing.currentStock,
      minStock: ing.minStock,
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp,
    })),
    reports: [],
  };
}

export function cloneMagacinState(state: MagacinState): MagacinState {
  return structuredClone(state);
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

export function isIngredientLowStock(ingredient: Ingredient) {
  return ingredient.currentStock < ingredient.minStock;
}

export function formatReportTotalRsd(totalRsd: number) {
  return `${totalRsd.toLocaleString("sr-RS")} RSD`;
}
