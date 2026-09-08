import type { MealType } from "@/lib/meal-types";
import type { ZetonStatus } from "@/lib/ezeton-mock";
import { DISH_IDS } from "@/lib/dish-catalog-mock";

import { resolveKitchenStaffRole, getKitchenEmployeeByEmail } from "@/lib/kuhinja-staff-store";
import type { KitchenStaffRole } from "@/lib/kuhinja-roles";

export const KUHINJA_MOCK_PASSWORD = "kuhinja123";

export type KuhinjaMockAccount = {
  email: string;
  password: string;
  displayName: string;
  role: KitchenStaffRole;
};

export const KUHINJA_MOCK_ACCOUNTS: KuhinjaMockAccount[] = [
  {
    email: "moderator@emenza.rs",
    password: KUHINJA_MOCK_PASSWORD,
    displayName: "Ana Moderator",
    role: "moderator",
  },
  {
    email: "kuvar@emenza.rs",
    password: KUHINJA_MOCK_PASSWORD,
    displayName: "Marko Kuvar",
    role: "kuvar",
  },
  {
    email: "salter@emenza.rs",
    password: KUHINJA_MOCK_PASSWORD,
    displayName: "Jovana Operater",
    role: "salter",
  },
  {
    email: "kuhinja@emenza.rs",
    password: KUHINJA_MOCK_PASSWORD,
    displayName: "Marko Kuhar",
    role: "moderator",
  },
];

export function findKuhinjaMockAccount(email: string, password: string): KuhinjaMockAccount | null {
  const normalizedEmail = email.trim().toLowerCase();
  const account =
    KUHINJA_MOCK_ACCOUNTS.find(
      (entry) => entry.email === normalizedEmail && entry.password === password,
    ) ?? null;

  if (!account) {
    return null;
  }

  const employee = getKitchenEmployeeByEmail(account.email);

  return {
    ...account,
    displayName: employee?.displayName ?? account.displayName,
    role: resolveKitchenStaffRole(account.email, account.role),
  };
}

export type KitchenMenuSlotId = "main" | "side" | "salad" | "dessert";

export type KitchenMealDetailsRow = {
  glavnoJelo: string;
  dodatak: string;
  salata: string;
  obrok: string;
  isPosno?: boolean;
};

export type KitchenReservationStatus =
  | "iskorisceno"
  | "propusteno"
  | "aktivno"
  | "zakazano"
  | "nerezervisano";

export type KitchenPickupMode = "u_menzi" | "poneti";

export type KitchenBookingStatus = "proknjizeno" | "uspesno";
export type KitchenPickupChannel = "card" | "qr";

export type DailyMenuSlot = {
  slotId: KitchenMenuSlotId;
  dishIds: string[];
  /** Dostupna količina po jelu (broj porcija). */
  dishStock: Record<string, number>;
};

export type DailyMenuEntry = {
  id: string;
  dateKey: string;
  mealType: MealType;
  slots: DailyMenuSlot[];
  published: boolean;
  updatedAt: string;
};

export type KuhinjaJelovnikState = {
  menus: DailyMenuEntry[];
};

export type KitchenReservationRecord = {
  id: string;
  dateKey: string;
  mealType: MealType;
  studentName: string;
  status: KitchenReservationStatus;
  items: KitchenMealDetailsRow;
  pickupMode?: KitchenPickupMode;
  zetonStatus?: ZetonStatus;
  studentFullName?: string;
  userType?: string;
  dateOfBirth?: string;
  faculty?: string;
  bookingStatus?: KitchenBookingStatus;
  pickupChannel?: KitchenPickupChannel;
  pickedUpAt?: string;
  cardId?: string;
  pickupCode?: string;
};

export const kitchenSlotOrder: KitchenMenuSlotId[] = ["main", "side", "salad", "dessert"];

export const kitchenSlotLabels: Record<KitchenMenuSlotId, string> = {
  main: "Glavno jelo",
  side: "Dodatak",
  salad: "Salata",
  dessert: "Dezert",
};

export const kitchenSlotToMealField: Record<
  KitchenMenuSlotId,
  keyof Pick<KitchenMealDetailsRow, "glavnoJelo" | "dodatak" | "salata" | "obrok">
> = {
  main: "glavnoJelo",
  side: "dodatak",
  salad: "salata",
  dessert: "obrok",
};

function menuId(dateKey: string, mealType: MealType) {
  return `menu-${dateKey}-${mealType}`;
}

export const DEFAULT_DISH_STOCK = 100;

function stockForDishes(dishIds: string[], existing?: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    dishIds.map((dishId) => [dishId, existing?.[dishId] ?? DEFAULT_DISH_STOCK]),
  );
}

function buildMenuSlots(partial: Partial<Record<KitchenMenuSlotId, string[]>>): DailyMenuSlot[] {
  return kitchenSlotOrder.map((slotId) => {
    const dishIds = partial[slotId] ?? [];
    return {
      slotId,
      dishIds,
      dishStock: stockForDishes(dishIds),
    };
  });
}

function createMenuEntry(
  dateKey: string,
  mealType: MealType,
  slots: Partial<Record<KitchenMenuSlotId, string[]>>,
  published: boolean,
): DailyMenuEntry {
  return {
    id: menuId(dateKey, mealType),
    dateKey,
    mealType,
    slots: buildMenuSlots(slots),
    published,
    updatedAt: new Date().toISOString(),
  };
}

export const SEED_KITCHEN_RESERVATIONS: KitchenReservationRecord[] = [
  {
    id: "kr-h1",
    dateKey: "2026-03-03",
    mealType: "lunch",
    studentName: "Marko P.",
    studentFullName: "Marko Petrović",
    dateOfBirth: "3. 9. 2000.",
    faculty: "Mašinski fakultet",
    status: "iskorisceno",
    bookingStatus: "uspesno",
    pickupChannel: "card",
    pickedUpAt: "2026-03-03T11:46:00.000Z",
    cardId: "EMZ-CARD-3456",
    pickupCode: "EMZ-20260303-L-112233",
    zetonStatus: "used",
    items: {
      glavnoJelo: "Gulaš",
      dodatak: "Pire",
      salata: "Kupus salata",
      obrok: "Banana",
    },
  },
  {
    id: "kr-h2",
    dateKey: "2026-03-03",
    mealType: "lunch",
    studentName: "Milica T.",
    studentFullName: "Milica Todorović",
    dateOfBirth: "21. 2. 2002.",
    faculty: "Ekonomski fakultet",
    status: "iskorisceno",
    bookingStatus: "uspesno",
    pickupChannel: "qr",
    pickedUpAt: "2026-03-03T11:28:00.000Z",
    cardId: "EMZ-CARD-9012",
    pickupCode: "EMZ-20260303-L-445566",
    zetonStatus: "none",
    items: {
      glavnoJelo: "Bečka šnicla",
      dodatak: "Krompir",
      salata: "Šopska salata",
      obrok: "Jabuka",
    },
  },
  {
    id: "kr-1",
    dateKey: "2026-03-03",
    mealType: "lunch",
    studentName: "Jovana M.",
    studentFullName: "Jovana Marković",
    dateOfBirth: "12. 4. 2001.",
    faculty: "Fakultet organizacionih nauka",
    status: "aktivno",
    bookingStatus: "proknjizeno",
    cardId: "EMZ-CARD-7842",
    pickupCode: "EMZ-20260303-L-847291",
    zetonStatus: "active",
    items: {
      glavnoJelo: "Pasulj prebranac + Bečka šnicla",
      dodatak: "Pirinač",
      salata: "Kupus salata + Šopska salata",
      obrok: "Kompot ×2",
      isPosno: true,
    },
  },
  {
    id: "kr-2",
    dateKey: "2026-03-03",
    mealType: "lunch",
    studentName: "Nikola S.",
    studentFullName: "Nikola Stojanović",
    dateOfBirth: "7. 11. 1999.",
    faculty: "Elektrotehnički fakultet",
    status: "aktivno",
    bookingStatus: "proknjizeno",
    cardId: "EMZ-CARD-5567",
    pickupCode: "EMZ-20260303-L-778899",
    zetonStatus: "none",
    items: {
      glavnoJelo: "Bečka šnicla",
      dodatak: "Krompir",
      salata: "Šopska salata",
      obrok: "Jabuka",
    },
  },
  {
    id: "kr-3",
    dateKey: "2026-03-03",
    mealType: "lunch",
    studentName: "Ana K.",
    studentFullName: "Ana Kovačević",
    dateOfBirth: "18. 6. 2003.",
    faculty: "Pravni fakultet",
    status: "aktivno",
    bookingStatus: "proknjizeno",
    cardId: "EMZ-CARD-7821",
    pickupCode: "EMZ-20260303-L-223344",
    zetonStatus: "used",
    items: {
      glavnoJelo: "Pileći file ×2",
      dodatak: "Pirinač",
      salata: "Zelena salata",
      obrok: "Jogurt",
    },
  },
  {
    id: "kr-4",
    dateKey: "2026-03-04",
    mealType: "lunch",
    studentName: "Marko P.",
    status: "zakazano",
    items: {
      glavnoJelo: "Gulaš",
      dodatak: "Pire",
      salata: "Kupus salata",
      obrok: "Banana",
    },
  },
  {
    id: "kr-5",
    dateKey: "2026-03-04",
    mealType: "lunch",
    studentName: "Milica T.",
    status: "zakazano",
    items: {
      glavnoJelo: "Bečka šnicla",
      dodatak: "Krompir",
      salata: "Šopska salata",
      obrok: "Jabuka",
    },
  },
  {
    id: "kr-6",
    dateKey: "2026-03-04",
    mealType: "lunch",
    studentName: "Stefan R.",
    status: "zakazano",
    items: {
      glavnoJelo: "Pileći file",
      dodatak: "Pirinač + Krompir",
      salata: "Zelena salata",
      obrok: "Jogurt",
    },
  },
  {
    id: "kr-7",
    dateKey: "2026-03-04",
    mealType: "dinner",
    studentName: "Ivana L.",
    status: "zakazano",
    items: {
      glavnoJelo: "Rižoto sa pečurkama",
      dodatak: "Integralni hleb",
      salata: "Rukola",
      obrok: "Orašasti mix",
      isPosno: true,
    },
  },
  {
    id: "kr-8",
    dateKey: "2026-03-05",
    mealType: "lunch",
    studentName: "Petar D.",
    status: "zakazano",
    items: {
      glavnoJelo: "Gulaš",
      dodatak: "Pire",
      salata: "Kupus salata",
      obrok: "Banana",
    },
  },
  {
    id: "kr-9",
    dateKey: "2026-03-05",
    mealType: "lunch",
    studentName: "Sara V.",
    status: "zakazano",
    items: {
      glavnoJelo: "Bečka šnicla ×2",
      dodatak: "Krompir",
      salata: "Šopska salata",
      obrok: "Jabuka",
    },
  },
  {
    id: "kr-10",
    dateKey: "2026-03-06",
    mealType: "breakfast",
    studentName: "Luka B.",
    status: "zakazano",
    items: {
      glavnoJelo: "Pileći file",
      dodatak: "Pirinač",
      salata: "Zelena salata",
      obrok: "Jabuka",
    },
  },
];

export function createInitialKuhinjaJelovnikState(): KuhinjaJelovnikState {
  return {
    menus: [
      createMenuEntry(
        "2026-03-03",
        "lunch",
        {
          main: [DISH_IDS.pasuljPrebranac, DISH_IDS.beckaSnicla, DISH_IDS.pileciFile],
          side: [DISH_IDS.pirinac, DISH_IDS.krompir],
          salad: [DISH_IDS.kupusSalata, DISH_IDS.sopskaSalata, DISH_IDS.zelenaSalata],
          dessert: [DISH_IDS.kompot, DISH_IDS.jabuka, DISH_IDS.jogurt],
        },
        true,
      ),
      createMenuEntry(
        "2026-03-03",
        "dinner",
        {
          main: [DISH_IDS.rizotoPecurke, DISH_IDS.gulas],
          side: [DISH_IDS.integralniHleb, DISH_IDS.pire],
          salad: [DISH_IDS.rukola, DISH_IDS.zelenaSalata],
          dessert: [DISH_IDS.orasastiMix, DISH_IDS.banana],
        },
        true,
      ),
      createMenuEntry(
        "2026-03-04",
        "lunch",
        {
          main: [DISH_IDS.pileciFile, DISH_IDS.beckaSnicla, DISH_IDS.gulas],
          side: [DISH_IDS.pirinac, DISH_IDS.krompir, DISH_IDS.pire],
          salad: [DISH_IDS.sopskaSalata, DISH_IDS.kupusSalata, DISH_IDS.zelenaSalata],
          dessert: [DISH_IDS.jabuka, DISH_IDS.jogurt, DISH_IDS.banana],
        },
        true,
      ),
      createMenuEntry(
        "2026-03-04",
        "dinner",
        {
          main: [DISH_IDS.rizotoPecurke, DISH_IDS.gulas],
          side: [DISH_IDS.integralniHleb, DISH_IDS.pire],
          salad: [DISH_IDS.rukola, DISH_IDS.mesanaSalata],
          dessert: [DISH_IDS.orasastiMix, DISH_IDS.banana],
        },
        false,
      ),
      createMenuEntry(
        "2026-03-05",
        "lunch",
        {
          main: [DISH_IDS.gulas, DISH_IDS.beckaSnicla],
          side: [DISH_IDS.pire, DISH_IDS.krompir],
          salad: [DISH_IDS.kupusSalata, DISH_IDS.sopskaSalata],
          dessert: [DISH_IDS.banana, DISH_IDS.jabuka],
        },
        true,
      ),
    ],
  };
}

export function cloneKuhinjaJelovnikState(state: KuhinjaJelovnikState): KuhinjaJelovnikState {
  return structuredClone(state);
}

let mutableSeedKitchenReservations: KitchenReservationRecord[] | null = null;

function getSeedKitchenStore(): KitchenReservationRecord[] {
  if (!mutableSeedKitchenReservations) {
    mutableSeedKitchenReservations = structuredClone(SEED_KITCHEN_RESERVATIONS);
  }
  return mutableSeedKitchenReservations;
}

export function getSeedKitchenReservations(): KitchenReservationRecord[] {
  return getSeedKitchenStore();
}

export function markKitchenReservationPickedUp(
  pickupCode: string,
): KitchenReservationRecord | null {
  const store = getSeedKitchenStore();
  const found = store.find(
    (r) => r.pickupCode?.toUpperCase() === pickupCode.toUpperCase(),
  );
  if (found) {
    found.status = "iskorisceno";
    found.bookingStatus = "uspesno";
    found.pickedUpAt = new Date().toISOString();
  }
  return found ?? null;
}
