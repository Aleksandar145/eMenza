export type DishCategory = "main" | "side" | "salad" | "dessert";

export type DishStatus = "active" | "pending_approval" | "archived";

export type DishBadge = string;

export const BUILTIN_BADGES = [
  "tradicionalno",
  "standardno",
  "high_protein",
  "posno",
  "meso",
  "riba",
  "dijetalno",
  "vege",
  "vegan",
  "mlecno",
  "gluten_free",
  "sezonsko",
  "voce",
] as const;

export type BuiltinBadge = (typeof BUILTIN_BADGES)[number];

export const dishBadgeLabels: Record<string, string> = {
  tradicionalno: "Tradicionalno",
  standardno: "Standardno",
  high_protein: "High protein",
  posno: "Posno",
  meso: "Meso",
  riba: "Riba",
  dijetalno: "Dijetalno",
  vege: "Vege",
  vegan: "Vegan",
  mlecno: "Mlečno",
  gluten_free: "Bez glutena",
  sezonsko: "Sezonsko",
  voce: "Voće",
};

export const dishBadgeOptions: DishBadge[] = [
  "tradicionalno",
  "standardno",
  "high_protein",
  "posno",
  "meso",
  "riba",
  "dijetalno",
  "vege",
  "vegan",
  "mlecno",
  "gluten_free",
  "sezonsko",
  "voce",
];

export const dishBadgeStyles: Record<string, string> = {
  tradicionalno: "bg-amber-100 text-amber-900",
  standardno: "bg-slate-100 text-slate-700",
  high_protein: "bg-violet-100 text-violet-800",
  posno: "bg-sky-100 text-sky-800",
  meso: "bg-red-100 text-red-800",
  riba: "bg-cyan-100 text-cyan-800",
  dijetalno: "bg-emerald-100 text-emerald-800",
  vege: "bg-lime-100 text-lime-900",
  vegan: "bg-green-100 text-green-800",
  mlecno: "bg-blue-100 text-blue-800",
  gluten_free: "bg-orange-100 text-orange-800",
  sezonsko: "bg-yellow-100 text-yellow-900",
  voce: "bg-pink-100 text-pink-800",
};

export type CustomBadgeDef = {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
};

export function isBuiltinBadge(badge: string): badge is BuiltinBadge {
  return BUILTIN_BADGES.includes(badge as BuiltinBadge);
}

export function getBadgeLabel(
  badge: string,
  customDefs: CustomBadgeDef[],
): string {
  if (isBuiltinBadge(badge)) {
    return dishBadgeLabels[badge];
  }
  return customDefs.find((d) => d.id === badge)?.name ?? badge;
}

export function getBadgeStyles(
  badge: string,
  customDefs: CustomBadgeDef[],
): string {
  if (isBuiltinBadge(badge)) {
    return dishBadgeStyles[badge];
  }
  const def = customDefs.find((d) => d.id === badge);
  if (def) {
    return "";
  }
  return "bg-gray-100 text-gray-700";
}

export function getBadgeInlineStyle(
  badge: string,
  customDefs: CustomBadgeDef[],
): Record<string, string> | undefined {
  if (isBuiltinBadge(badge)) return undefined;
  const def = customDefs.find((d) => d.id === badge);
  if (!def) return undefined;
  return { backgroundColor: def.bgColor, color: def.textColor };
}

export const defaultPortionWeightGramsByCategory: Record<DishCategory, number> = {
  main: 350,
  side: 200,
  salad: 150,
  dessert: 120,
};

export type Dish = {
  id: string;
  name: string;
  category: DishCategory;
  priceRsd: number;
  portionWeightGrams: number;
  imageUrl: string;
  badges: DishBadge[];
  status: DishStatus;
  proposedBy?: "kitchen" | "admin";
  createdAt: string;
  updatedAt: string;
};

export type DishCatalogState = {
  dishes: Dish[];
};

export const dishCategoryLabels: Record<DishCategory, string> = {
  main: "Glavno jelo",
  side: "Dodatak",
  salad: "Salata",
  dessert: "Dezert",
};

export const dishStatusLabels: Record<DishStatus, string> = {
  active: "Aktivno",
  pending_approval: "Na odobrenju",
  archived: "Arhivirano",
};

const sharedImages = {
  main1:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBetAAxPDFoAwyj39KbGs-WY3KcbOJtwNyHxBNUSBEldKIOeQhN_Nn4Ypkj-IWMrCQslLJ1jpG17RExM2S7Zj1kyJLyDC0JdU0krXbvaAKhSRDdHFN99CXo2jkRom2PUNPZd3yblKxX8tIJlusjc7JsAvSfIEPziEBWrJFGTE9B2aoAy1F4PsBVHA-G8AaRhLZy__8UF6m8zx_u6ttAyOKdCI9MMsOSGWn2l51RnPirOhahIg2D5bJLY3lrUfatIFTuPN4fEWOiXs0",
  main2:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDLXa5e_KPxxeTOzTf-JSLUkwzngZ5XsDOzDXIo1V99JTFoX45GkFFd01WM8nfPIrGOZG66lemzzu4wxH9k6JVNQnpNdYhTlCLC1bI_Znf8RxkgecnoXfU9wyHz6z8Tey6-7N34UOmuJMl-33N5s12JlQG0OH6HFON3G8c-iKuJjgKHV5nsGcJnNxILJIXzjLpu4MfUztUXWsDDxZAomRq7HFJ3fn5WqeaS8dvWRZS4XNL-X3DbRUiI3uLB_4afB-K9CbyLgGGgTn0",
  side:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBetAAxPDFoAwyj39KbGs-WY3KcbOJtwNyHxBNUSBEldKIOeQhN_Nn4Ypkj-IWMrCQslLJ1jpG17RExM2S7Zj1kyJLyDC0JdU0krXbvaAKhSRDdHFN99CXo2jkRom2PUNPZd3yblKxX8tIJlusjc7JsAvSfIEPziEBWrJFGTE9B2aoAy1F4PsBVHA-G8AaRhLZy__8UF6m8zx_u6ttAyOKdCI9MMsOSGWn2l51RnPirOhahIg2D5bJLY3lrUfatIFTuPN4fEWOiXs0",
  salad:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDLXa5e_KPxxeTOzTf-JSLUkwzngZ5XsDOzDXIo1V99JTFoX45GkFFd01WM8nfPIrGOZG66lemzzu4wxH9k6JVNQnpNdYhTlCLC1bI_Znf8RxkgecnoXfU9wyHz6z8Tey6-7N34UOmuJMl-33N5s12JlQG0OH6HFON3G8c-iKuJjgKHV5nsGcJnNxILJIXzjLpu4MfUztUXWsDDxZAomRq7HFJ3fn5WqeaS8dvWRZS4XNL-X3DbRUiI3uLB_4afB-K9CbyLgGGgTn0",
  dessert:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBlfi5MIImqUVjejN_OOAXh4sGQVnIwf-AutRquXtsCyA3YscG--6ovnRC0qNbzB_uoBoNR0Mcq5np7xtfZl6C6NrY-JO6IAvXENO3n_eURqMMejLIbuvzaEg7_Jc2E3hr_KHMnIagpmuzxfaNSIN7l16vBqfX6T6voFZs3R9FlDpbdV3S0JOC2weqtGBwMgxVyp7nnpbnclSmFIBkIqK8HdMHsOQ9GJ3Z8DK3xHJkP1QFIe-1cIBcdLWkTf_WOlRuTTv6Il45TRuU",
};

const seedTimestamp = "2026-03-01T08:00:00.000Z";

/** Stabilni ID-jevi za seed jelovnika i migracije. */
export const DISH_IDS = {
  pileciFile: "dish-main-pileci-file",
  beckaSnicla: "dish-main-becka-snicla",
  gulas: "dish-main-gulas",
  pasuljPrebranac: "dish-main-pasulj-prebranac",
  rizotoPecurke: "dish-main-rizoto-pecurke",
  pirinac: "dish-side-pirinac",
  krompir: "dish-side-krompir",
  pire: "dish-side-pire",
  integralniHleb: "dish-side-integralni-hleb",
  sopskaSalata: "dish-salad-sopska",
  zelenaSalata: "dish-salad-zelena",
  kupusSalata: "dish-salad-kupus",
  rukola: "dish-salad-rukola",
  mesanaSalata: "dish-salad-mesana",
  jabuka: "dish-dessert-jabuka",
  jogurt: "dish-dessert-jogurt",
  banana: "dish-dessert-banana",
  kompot: "dish-dessert-kompot",
  orasastiMix: "dish-dessert-orasasti-mix",
} as const;

function seedDish(
  id: string,
  name: string,
  category: DishCategory,
  priceRsd: number,
  imageUrl: string,
  badges: DishBadge[] = [],
): Dish {
  return {
    id,
    name,
    category,
    priceRsd,
    portionWeightGrams: defaultPortionWeightGramsByCategory[category],
    imageUrl,
    badges,
    status: "active",
    proposedBy: "admin",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  };
}

export function createInitialDishCatalogState(): DishCatalogState {
  return {
    dishes: [
      seedDish(DISH_IDS.pileciFile, "Pileći file", "main", 70, sharedImages.main1, [
        "high_protein",
        "meso",
      ]),
      seedDish(DISH_IDS.beckaSnicla, "Bečka šnicla", "main", 50, sharedImages.main2, [
        "standardno",
        "meso",
      ]),
      seedDish(DISH_IDS.gulas, "Gulaš", "main", 60, sharedImages.main1, ["tradicionalno", "meso"]),
      seedDish(DISH_IDS.pasuljPrebranac, "Pasulj prebranac", "main", 55, sharedImages.main1, [
        "tradicionalno",
        "posno",
        "vege",
      ]),
      seedDish(DISH_IDS.rizotoPecurke, "Rižoto sa pečurkama", "main", 65, sharedImages.main2, [
        "posno",
        "vege",
      ]),
      seedDish(DISH_IDS.pirinac, "Pirinač", "side", 50, sharedImages.side, [
        "standardno",
        "vege",
        "posno",
      ]),
      seedDish(DISH_IDS.krompir, "Krompir", "side", 50, sharedImages.side, [
        "standardno",
        "vege",
        "posno",
      ]),
      seedDish(DISH_IDS.pire, "Pire", "side", 45, sharedImages.side, ["standardno", "vege"]),
      seedDish(DISH_IDS.integralniHleb, "Integralni hleb", "side", 40, sharedImages.side, [
        "vege",
      ]),
      seedDish(DISH_IDS.sopskaSalata, "Šopska salata", "salad", 40, sharedImages.salad, [
        "tradicionalno",
        "vege",
      ]),
      seedDish(DISH_IDS.zelenaSalata, "Zelena salata", "salad", 40, sharedImages.salad, [
        "posno",
        "vege",
      ]),
      seedDish(DISH_IDS.kupusSalata, "Kupus salata", "salad", 35, sharedImages.salad, [
        "sezonsko",
        "posno",
        "vege",
      ]),
      seedDish(DISH_IDS.rukola, "Rukola", "salad", 38, sharedImages.salad, ["posno", "vege"]),
      seedDish(DISH_IDS.mesanaSalata, "Mešana salata", "salad", 40, sharedImages.salad, ["vege"]),
      seedDish(DISH_IDS.jabuka, "Jabuka", "dessert", 40, sharedImages.dessert, [
        "voce",
        "posno",
        "vege",
      ]),
      seedDish(DISH_IDS.jogurt, "Jogurt", "dessert", 40, sharedImages.dessert, ["mlecno", "dijetalno"]),
      seedDish(DISH_IDS.banana, "Banana", "dessert", 35, sharedImages.dessert, ["voce", "vege"]),
      seedDish(DISH_IDS.kompot, "Kompot", "dessert", 35, sharedImages.dessert, [
        "posno",
        "tradicionalno",
      ]),
      seedDish(DISH_IDS.orasastiMix, "Orašasti mix", "dessert", 45, sharedImages.dessert, [
        "posno",
        "vege",
      ]),
    ],
  };
}

export function cloneDishCatalogState(state: DishCatalogState): DishCatalogState {
  return structuredClone(state);
}

export type MealOptionView = {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  badges: DishBadge[];
  image: string;
  disabled?: boolean;
};

export function dishToMealOption(dish: Dish, stock = 100): MealOptionView {
  return {
    id: dish.id,
    name: dish.name,
    category: dishCategoryLabels[dish.category],
    stock,
    price: dish.priceRsd,
    badges: dish.badges,
    image: dish.imageUrl,
  };
}
