import { calendarTodayDateKey } from "@/lib/dashboard-mock";
import {
  adminReturnCutlery,
  claimZetonWithMeal,
  consumeZetonForCutlery,
  purchaseZetonWithDeposit,
  reactivateZetonWithDeposit,
  type UserZetonState,
  type ZetonEvent,
} from "@/lib/ezeton-mock";
import { adjustStudentCardBalance, resolveStudentCardForPurchase } from "@/lib/referent-cards-store";

export const EZETON_STORAGE_KEY = "emenza-ezeton";
export const EZETON_STORAGE_KEY_PREFIX = "emenza-ezeton";
export const EZETON_DEMO_VERSION = 3;

/** Demo student token — synced with Moj zeton page */
export const DEMO_STUDENT_TOKEN_CODE = "EZ-284719";

export type EzetonRecord = {
  tokenCode: string;
  studentName: string;
  zeton: UserZetonState;
  history: ZetonEvent[];
};

type StoredEzetonState = {
  demoVersion?: number;
  records: EzetonRecord[];
};

type EzetonListener = () => void;

const listeners = new Set<EzetonListener>();
let memoryState: EzetonRecord[] | null = null;

function createSeedRecords(): EzetonRecord[] {
  return [
    {
      tokenCode: DEMO_STUDENT_TOKEN_CODE,
      studentName: "Jovana Petrović",
      zeton: {
        status: "none",
        tokenCode: DEMO_STUDENT_TOKEN_CODE,
        mealName: null,
        mealSlot: null,
        claimedAt: null,
        usedAt: null,
      },
      history: [],
    },
    {
      tokenCode: "EZ-847291",
      studentName: "Marko Nikolić",
      zeton: {
        status: "used",
        tokenCode: "EZ-847291",
        mealName: "Bečka šnicla + Krompir",
        mealSlot: "Ručak · 03.03.2026.",
        claimedAt: "2026-03-03T11:45:00",
        usedAt: "2026-03-03T12:10:00",
      },
      history: [
        {
          id: "evt-m2",
          type: "cutlery_taken",
          timestamp: "2026-03-03T12:10:00",
          label: "Pribor preuzet",
          detail: "Žeton deaktiviran dok ne vratite pribor.",
          actor: "user",
        },
        {
          id: "evt-m1",
          type: "meal_claimed",
          timestamp: "2026-03-03T11:45:00",
          label: "Obrok preuzet",
          detail: "Bečka šnicla + Krompir — žeton aktiviran.",
          actor: "user",
        },
      ],
    },
    {
      tokenCode: "EZ-391056",
      studentName: "Ana Jovanović",
      zeton: {
        status: "used",
        tokenCode: "EZ-391056",
        mealName: "Pileća supa + Salata",
        mealSlot: "Ručak · 03.03.2026.",
        claimedAt: "2026-03-03T11:30:00",
        usedAt: "2026-03-03T11:55:00",
      },
      history: [
        {
          id: "evt-a2",
          type: "cutlery_taken",
          timestamp: "2026-03-03T11:55:00",
          label: "Pribor preuzet",
          detail: "Žeton deaktiviran dok ne vratite pribor.",
          actor: "user",
        },
        {
          id: "evt-a1",
          type: "meal_claimed",
          timestamp: "2026-03-03T11:30:00",
          label: "Obrok preuzet",
          detail: "Pileća supa + Salata — žeton aktiviran.",
          actor: "user",
        },
      ],
    },
    {
      tokenCode: "EZ-502184",
      studentName: "Stefan Ilić",
      zeton: {
        status: "active",
        tokenCode: "EZ-502184",
        mealName: "Gulaš + Pire",
        mealSlot: "Ručak · 03.03.2026.",
        claimedAt: "2026-03-03T12:00:00",
        usedAt: null,
      },
      history: [
        {
          id: "evt-s1",
          type: "meal_claimed",
          timestamp: "2026-03-03T12:00:00",
          label: "Obrok preuzet",
          detail: "Gulaš + Pire — žeton aktiviran.",
          actor: "user",
        },
      ],
    },
    {
      tokenCode: "EZ-663491",
      studentName: "Marija Simić",
      zeton: {
        status: "active",
        tokenCode: "EZ-663491",
        mealName: null,
        mealSlot: null,
        claimedAt: null,
        usedAt: null,
      },
      history: [],
    },
  ];
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function cloneRecords(records: EzetonRecord[]): EzetonRecord[] {
  return records.map((record) => ({
    ...record,
    zeton: { ...record.zeton },
    history: [...record.history],
  }));
}

function persistState(records: EzetonRecord[]) {
  memoryState = cloneRecords(records);
  if (typeof window !== "undefined") {
    const payload: StoredEzetonState = {
      demoVersion: EZETON_DEMO_VERSION,
      records: memoryState,
    };
    localStorage.setItem(EZETON_STORAGE_KEY, JSON.stringify(payload));
  }
  notifyListeners();
}

function loadStoredState(): EzetonRecord[] {
  if (memoryState) {
    return cloneRecords(memoryState);
  }

  if (typeof window === "undefined") {
    return createSeedRecords();
  }

  const raw = localStorage.getItem(EZETON_STORAGE_KEY);
  if (!raw) {
    const seed = createSeedRecords();
    persistState(seed);
    return cloneRecords(seed);
  }

  try {
    const parsed = JSON.parse(raw) as StoredEzetonState;
    if (parsed.demoVersion !== EZETON_DEMO_VERSION || !Array.isArray(parsed.records)) {
      const seed = createSeedRecords();
      persistState(seed);
      return cloneRecords(seed);
    }

    memoryState = cloneRecords(parsed.records);
    return cloneRecords(memoryState);
  } catch {
    const seed = createSeedRecords();
    persistState(seed);
    return cloneRecords(seed);
  }
}

export function subscribeEzeton(listener: EzetonListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadEzetonRecords(): EzetonRecord[] {
  return loadStoredState();
}

/** SSR/hydration-safe snapshot — always seed data, never localStorage. */
export function getEzetonHydrationRecords(): EzetonRecord[] {
  return cloneRecords(createSeedRecords());
}

export function lookupZetonByCode(tokenCode: string): EzetonRecord | null {
  const normalized = tokenCode.trim().toUpperCase();
  return loadStoredState().find((record) => record.tokenCode === normalized) ?? null;
}

export function getDemoStudentZeton(): EzetonRecord {
  const record = lookupZetonByCode(DEMO_STUDENT_TOKEN_CODE);
  if (record) {
    return record;
  }

  const seed = createSeedRecords()[0];
  return seed;
}

export function countZetonsAwaitingReturn(): number {
  return loadStoredState().filter((record) => record.zeton.status === "used").length;
}

export function countZetonsReturnedToday(): number {
  return loadStoredState().reduce((total, record) => {
    const todayReturns = record.history.filter(
      (event) =>
        event.type === "cutlery_returned" && event.timestamp.startsWith(calendarTodayDateKey),
    ).length;
    return total + todayReturns;
  }, 0);
}

function updateRecord(tokenCode: string, updater: (record: EzetonRecord) => EzetonRecord) {
  const records = loadStoredState();
  const index = records.findIndex((record) => record.tokenCode === tokenCode);
  if (index === -1) {
    return null;
  }

  records[index] = updater(records[index]);
  persistState(records);
  return records[index];
}

export function returnZetonCutlery(tokenCode: string): {
  ok: true;
  record: EzetonRecord;
  event: ZetonEvent;
} | { ok: false; error: string } {
  const record = lookupZetonByCode(tokenCode);
  if (!record) {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  if (record.zeton.status !== "used") {
    return { ok: false, error: "Student još nije uzeo pribor — žeton nije spreman za vraćanje." };
  }

  const result = adminReturnCutlery(record.zeton);
  if (!result.event) {
    return { ok: false, error: "Žeton nije spreman za vraćanje." };
  }

  const updated = updateRecord(tokenCode, (current) => ({
    ...current,
    zeton: result.state,
    history: [result.event!, ...current.history],
  }));

  if (!updated) {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  return { ok: true, record: updated, event: result.event };
}

export function demoClaimMealForStudent(
  tokenCode: string,
  mealName: string,
  mealSlot: string,
): EzetonRecord | null {
  const record = lookupZetonByCode(tokenCode);
  if (!record) {
    return null;
  }

  const result = claimZetonWithMeal(record.zeton, mealName, mealSlot);
  return (
    updateRecord(tokenCode, (current) => ({
      ...current,
      zeton: result.state,
      history: [result.event, ...current.history],
    })) ?? null
  );
}

export function demoConsumeCutleryForStudent(tokenCode: string): EzetonRecord | null {
  const record = lookupZetonByCode(tokenCode);
  if (!record) {
    return null;
  }

  const result = consumeZetonForCutlery(record.zeton);
  if (!result.event) {
    return record;
  }

  return (
    updateRecord(tokenCode, (current) => ({
      ...current,
      zeton: result.state,
      history: [result.event!, ...current.history],
    })) ?? null
  );
}

export function demoAdminReturnForStudent(tokenCode: string): EzetonRecord | null {
  const result = returnZetonCutlery(tokenCode);
  return result.ok ? result.record : null;
}

export function purchaseZetonForStudent(
  tokenCode: string,
  depositRsd: number,
  options?: {
    cardId?: string;
    cardNumber?: string;
    skipCardCharge?: boolean;
  },
): { ok: true; record: EzetonRecord } | { ok: false; error: string } {
  const record = lookupZetonByCode(tokenCode);
  if (!record) {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  if (record.zeton.status !== "none") {
    return { ok: false, error: "Već imate aktiviran žeton." };
  }

  const skipCardCharge = options?.skipCardCharge ?? false;

  if (depositRsd > 0 && !skipCardCharge) {
    const card = resolveStudentCardForPurchase(options?.cardId, options?.cardNumber);
    if (!card) {
      return { ok: false, error: "Kartica nije pronađena." };
    }

    if (card.balanceRsd < depositRsd) {
      return { ok: false, error: "Nedovoljno sredstava na kartici." };
    }
  }

  const result = purchaseZetonWithDeposit(record.zeton);
  if (!result.ok) {
    return result;
  }

  if (depositRsd > 0 && !skipCardCharge) {
    const card = resolveStudentCardForPurchase(options?.cardId, options?.cardNumber);
    if (!card) {
      return { ok: false, error: "Kartica nije pronađena." };
    }

    adjustStudentCardBalance(
      card.id,
      -depositRsd,
      `Kaucija za žeton — ${result.state.tokenCode}`,
    );
  }

  const updated = updateRecord(tokenCode, (current) => ({
    ...current,
    zeton: result.state,
    history: [result.event, ...current.history],
  }));

  if (!updated) {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  return { ok: true, record: updated };
}

export function reactivateZetonForStudent(
  tokenCode: string,
  depositRsd: number,
  options?: {
    cardId?: string;
    cardNumber?: string;
    skipCardCharge?: boolean;
  },
): { ok: true; record: EzetonRecord } | { ok: false; error: string } {
  const record = lookupZetonByCode(tokenCode);
  if (!record) {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  if (record.zeton.status !== "used") {
    return { ok: false, error: "Žeton nije iskorišćen." };
  }

  const skipCardCharge = options?.skipCardCharge ?? false;

  if (depositRsd > 0 && !skipCardCharge) {
    const card = resolveStudentCardForPurchase(options?.cardId, options?.cardNumber);
    if (!card) {
      return { ok: false, error: "Kartica nije pronađena." };
    }

    if (card.balanceRsd < depositRsd) {
      return { ok: false, error: "Nedovoljno sredstava na kartici." };
    }
  }

  const result = reactivateZetonWithDeposit(record.zeton);
  if (!result.ok) {
    return result;
  }

  if (depositRsd > 0 && !skipCardCharge) {
    const card = resolveStudentCardForPurchase(options?.cardId, options?.cardNumber);
    if (!card) {
      return { ok: false, error: "Kartica nije pronađena." };
    }

    adjustStudentCardBalance(
      card.id,
      -depositRsd,
      `Reaktivacija žetona — ${result.state.tokenCode}`,
    );
  }

  const updated = updateRecord(tokenCode, (current) => ({
    ...current,
    zeton: result.state,
    history: [result.event, ...current.history],
  }));

  if (!updated) {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  return { ok: true, record: updated };
}
