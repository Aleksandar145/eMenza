import { ApiError } from "@/lib/api/client";
import {
  cloneKuhinjaJelovnikState,
  createInitialKuhinjaJelovnikState,
  DEFAULT_DISH_STOCK,
  kitchenSlotOrder,
  type DailyMenuEntry,
  type DailyMenuSlot,
  type KitchenMenuSlotId,
  type KuhinjaJelovnikState,
} from "@/lib/kuhinja-mock";
import {
  fetchMenusFromApi,
  fetchPublishedMenuFromApi,
  postMenuAction,
  shouldUseMenusApi,
  type JelovnikFetchRange,
  type MenuActionResponse,
  type PublishedMenuResponse,
} from "@/lib/backend/menus-api";
import {
  creatorSlotOrder,
  type CreatorSlotId,
  type MealOption,
} from "@/lib/kreator-obroka-mock";
import type { MealType } from "@/lib/meal-types";
import { dishToMealOption } from "@/lib/dish-catalog-mock";
import {
  getActiveDishesByIds,
  getDishesByIds,
  hydrateDishCatalogFromCache,
  isDishCatalogSynced,
  mergeRemoteDishes,
} from "@/lib/dish-catalog-store";
import {
  readJelovnikCache,
  writeJelovnikCache,
} from "@/lib/student-remote-cache";
import { getReservationAdvanceDays } from "@/lib/admin-system-store";
import { getBookingTodayDateKey } from "@/lib/meal-booking-window";

export const KUHINJA_JELOVNIK_STORAGE_KEY = "emenza-kuhinja-jelovnik";
export const KUHINJA_JELOVNIK_DEMO_VERSION = 3;

type StoredKuhinjaJelovnik = KuhinjaJelovnikState & { demoVersion?: number };

type KuhinjaJelovnikListener = () => void;

type SyncOptions = {
  force?: boolean;
  range?: JelovnikFetchRange;
};

const JELOVNIK_SYNC_PAST_DAYS = 42;
const JELOVNIK_SYNC_FUTURE_DAYS = 84;
const KITCHEN_BOOTSTRAP_PAST_DAYS = 7;
const KITCHEN_BOOTSTRAP_FUTURE_BUFFER_DAYS = 7;
const loadedJelovnikRanges = new Set<string>();
let jelovnikRemoteSyncSuspendDepth = 0;

export function runWithJelovnikRemoteSyncSuspended<T>(fn: () => Promise<T>): Promise<T> {
  jelovnikRemoteSyncSuspendDepth += 1;
  return fn().finally(() => {
    jelovnikRemoteSyncSuspendDepth -= 1;
  });
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDefaultJelovnikSyncRange(anchorDateKey = getBookingTodayDateKey()): JelovnikFetchRange {
  return {
    fromDateKey: addDays(anchorDateKey, -JELOVNIK_SYNC_PAST_DAYS),
    toDateKey: addDays(anchorDateKey, JELOVNIK_SYNC_FUTURE_DAYS),
  };
}

/** Smaller range for kitchen panel bootstrap — reservation window + buffer instead of ~126 days. */
export function getKitchenBootstrapJelovnikRange(anchorDateKey = getBookingTodayDateKey()): JelovnikFetchRange {
  const reservationWindow = getReservationAdvanceDays();
  return {
    fromDateKey: addDays(anchorDateKey, -KITCHEN_BOOTSTRAP_PAST_DAYS),
    toDateKey: addDays(anchorDateKey, reservationWindow + KITCHEN_BOOTSTRAP_FUTURE_BUFFER_DAYS),
  };
}

export function getJelovnikRangeForWeek(weekStartDateKey: string): JelovnikFetchRange {
  return {
    fromDateKey: addDays(weekStartDateKey, -7),
    toDateKey: addDays(weekStartDateKey, 13),
  };
}

function rangeCacheKey(range: JelovnikFetchRange) {
  return `${range.fromDateKey ?? ""}:${range.toDateKey ?? ""}`;
}

function mergeJelovnikStates(
  current: KuhinjaJelovnikState | null,
  incoming: KuhinjaJelovnikState,
): KuhinjaJelovnikState {
  if (!current) {
    return cloneKuhinjaJelovnikState(incoming);
  }

  const incomingKeys = new Set(
    incoming.menus.map((menu) => `${menu.dateKey}:${menu.mealType}`),
  );
  const kept = current.menus.filter(
    (menu) => !incomingKeys.has(`${menu.dateKey}:${menu.mealType}`),
  );

  return {
    menus: [...kept, ...incoming.menus.map(normalizeDailyMenu)],
  };
}

const listeners = new Set<KuhinjaJelovnikListener>();
let memoryState: KuhinjaJelovnikState | null = null;
let remoteState: KuhinjaJelovnikState | null = null;

const emptyJelovnikState: KuhinjaJelovnikState = { menus: [] };

export function isJelovnikSynced() {
  return !shouldUseMenusApi() || remoteState !== null;
}

/** True when cached or in-memory jelovnik is available — UI can render without waiting on network. */
export function isJelovnikHydratedForKitchenUI() {
  if (!shouldUseMenusApi()) {
    return true;
  }

  return memoryState !== null || remoteState !== null;
}

export async function syncKitchenJelovnikBootstrap(options?: SyncOptions) {
  return syncKuhinjaJelovnikFromApi({
    ...options,
    range: options?.range ?? getKitchenBootstrapJelovnikRange(),
  });
}

export function isPublishedMenuFetched(dateKey: string, mealType: MealType) {
  if (!shouldUseMenusApi()) {
    return true;
  }

  return publishedMenuFetchedKeys.has(`${dateKey}:${mealType}`);
}

const jelovnikSyncPromises = new Map<string, Promise<void>>();
const publishedMenuSyncPromises = new Map<string, Promise<void>>();
const publishedMenuFetchedKeys = new Set<string>();

export function hydrateStudentMenuCaches(options?: { notify?: boolean }) {
  const hydratedJelovnik = hydrateJelovnikFromSessionCache(options);
  const hydratedCatalog = hydrateDishCatalogFromCache(options);
  return hydratedJelovnik || hydratedCatalog;
}

function hydrateJelovnikFromSessionCache(options?: { notify?: boolean }) {
  const cached = readJelovnikCache();
  if (!cached) {
    return false;
  }

  remoteState = cloneKuhinjaJelovnikState(cached);
  memoryState = cloneKuhinjaJelovnikState(remoteState);
  if (options?.notify !== false) {
    notifyListeners();
  }
  return true;
}

function persistRemoteJelovnikState(state: KuhinjaJelovnikState) {
  remoteState = cloneKuhinjaJelovnikState(state);
  memoryState = cloneKuhinjaJelovnikState(remoteState);
  writeJelovnikCache(remoteState);
  notifyListeners();
}

function applyPublishedMenuResponse(response: PublishedMenuResponse) {
  if (response.menu) {
    remoteState = mergeMenuEntryIntoState(remoteState, response.menu);
    memoryState = mergeMenuEntryIntoState(memoryState, response.menu);
  }

  if (remoteState) {
    writeJelovnikCache(remoteState);
    notifyListeners();
  }

  mergeRemoteDishes(response.dishes);
}

export async function syncKuhinjaJelovnikFromApi(options?: SyncOptions) {
  if (!shouldUseMenusApi()) {
    return;
  }

  if (jelovnikRemoteSyncSuspendDepth > 0) {
    return;
  }

  const range = options?.range ?? getDefaultJelovnikSyncRange();
  const cacheKey = rangeCacheKey(range);

  if (!options?.force && loadedJelovnikRanges.has(cacheKey)) {
    return;
  }

  const inFlight = jelovnikSyncPromises.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  if (!remoteState) {
    hydrateJelovnikFromSessionCache();
  }

  const task = (async () => {
    try {
      const incoming = await fetchMenusFromApi(range);
      persistRemoteJelovnikState(mergeJelovnikStates(remoteState, incoming));
      loadedJelovnikRanges.add(cacheKey);
    } catch (error) {
      console.error("[jelovnik] sync failed", error);
      if (!remoteState) {
        persistRemoteJelovnikState(cloneKuhinjaJelovnikState(emptyJelovnikState));
      }
    } finally {
      jelovnikSyncPromises.delete(cacheKey);
    }
  })();

  jelovnikSyncPromises.set(cacheKey, task);
  return task;
}

export function ensureJelovnikRangeLoaded(weekStartDateKey: string) {
  return syncKuhinjaJelovnikFromApi({ range: getJelovnikRangeForWeek(weekStartDateKey) });
}

export async function syncPublishedMenuFromApi(
  dateKey: string,
  mealType: MealType,
  options?: SyncOptions,
) {
  if (!shouldUseMenusApi()) {
    return;
  }

  const cacheKey = `${dateKey}:${mealType}`;

  if (!options?.force && publishedMenuFetchedKeys.has(cacheKey)) {
    return;
  }

  const inFlight = publishedMenuSyncPromises.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  if (!remoteState) {
    hydrateJelovnikFromSessionCache();
  }

  hydrateDishCatalogFromCache();

  const task = (async () => {
    try {
      const response = await fetchPublishedMenuFromApi(dateKey, mealType);
      publishedMenuFetchedKeys.add(cacheKey);

      if (response.menu) {
        applyPublishedMenuResponse(response);
      } else {
        mergeRemoteDishes(response.dishes);
        if (!remoteState) {
          persistRemoteJelovnikState(cloneKuhinjaJelovnikState(emptyJelovnikState));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }

      const hasCachedMenu = Boolean(remoteState ?? readJelovnikCache());
      if (error instanceof ApiError && error.status === 408) {
        if (!hasCachedMenu) {
          console.warn("[jelovnik] published menu sync timed out (no cache)");
        }
      } else {
        console.error("[jelovnik] published menu sync failed", error);
      }

      publishedMenuFetchedKeys.add(cacheKey);
      if (!remoteState) {
        persistRemoteJelovnikState(cloneKuhinjaJelovnikState(emptyJelovnikState));
      }
    } finally {
      publishedMenuSyncPromises.delete(cacheKey);
    }
  })();

  publishedMenuSyncPromises.set(cacheKey, task);
  return task;
}

function withDemoVersion(state: KuhinjaJelovnikState): StoredKuhinjaJelovnik {
  return { ...state, demoVersion: KUHINJA_JELOVNIK_DEMO_VERSION };
}

let jelovnikNotifySuppressDepth = 0;

function notifyListeners() {
  if (jelovnikNotifySuppressDepth > 0) {
    return;
  }

  listeners.forEach((listener) => listener());
}

export async function runJelovnikBatchUpdate(fn: () => Promise<void>) {
  jelovnikNotifySuppressDepth += 1;
  try {
    await fn();
  } finally {
    jelovnikNotifySuppressDepth -= 1;
    if (jelovnikNotifySuppressDepth === 0) {
      listeners.forEach((listener) => listener());
    }
  }
}

function persistState(state: KuhinjaJelovnikState) {
  memoryState = cloneKuhinjaJelovnikState(state);
  if (typeof window !== "undefined" && !shouldUseMenusApi()) {
    localStorage.setItem(KUHINJA_JELOVNIK_STORAGE_KEY, JSON.stringify(withDemoVersion(state)));
  }
  notifyListeners();
}

function loadSyncedJelovnikState(): KuhinjaJelovnikState {
  if (remoteState) {
    return cloneKuhinjaJelovnikState(remoteState);
  }

  if (shouldUseMenusApi()) {
    return cloneKuhinjaJelovnikState(emptyJelovnikState);
  }

  return loadKuhinjaJelovnikState();
}

export function loadKuhinjaJelovnikState(): KuhinjaJelovnikState {
  if (shouldUseMenusApi()) {
    if (memoryState) {
      return cloneKuhinjaJelovnikState(memoryState);
    }
    if (remoteState) {
      return cloneKuhinjaJelovnikState(remoteState);
    }
    return cloneKuhinjaJelovnikState(emptyJelovnikState);
  }

  if (memoryState) {
    return cloneKuhinjaJelovnikState(memoryState);
  }

  if (typeof window === "undefined") {
    return createInitialKuhinjaJelovnikState();
  }

  try {
    const raw = localStorage.getItem(KUHINJA_JELOVNIK_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialKuhinjaJelovnikState();
      memoryState = initial;
      return cloneKuhinjaJelovnikState(initial);
    }

    const parsed = JSON.parse(raw) as StoredKuhinjaJelovnik;
    if (parsed.demoVersion !== KUHINJA_JELOVNIK_DEMO_VERSION) {
      const initial = createInitialKuhinjaJelovnikState();
      persistState(initial);
      return cloneKuhinjaJelovnikState(initial);
    }

    memoryState = {
      menus: (parsed.menus ?? createInitialKuhinjaJelovnikState().menus).map(normalizeDailyMenu),
    };
    return cloneKuhinjaJelovnikState(memoryState);
  } catch {
    const initial = createInitialKuhinjaJelovnikState();
    memoryState = initial;
    return cloneKuhinjaJelovnikState(initial);
  }
}

export function subscribeKuhinjaJelovnik(listener: KuhinjaJelovnikListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function mutateState(mutator: (state: KuhinjaJelovnikState) => KuhinjaJelovnikState) {
  const next = mutator(loadKuhinjaJelovnikState());
  persistState(next);
}

function menuKey(dateKey: string, mealType: MealType) {
  return `${dateKey}:${mealType}`;
}

export function getSyncedDailyMenu(dateKey: string, mealType: MealType): DailyMenuEntry | null {
  return (
    loadSyncedJelovnikState().menus.find(
      (menu) => menu.dateKey === dateKey && menu.mealType === mealType,
    ) ?? null
  );
}

/** True when cached menu (+ dishes if needed) is enough to render kreator without waiting on network. */
export function canRenderPublishedMenuFromCache(dateKey: string, mealType: MealType) {
  const menu = getSyncedDailyMenu(dateKey, mealType);
  if (!menu) {
    return false;
  }

  if (!menu.published) {
    return true;
  }

  const dishIds = [...new Set(menu.slots.flatMap((slot) => slot.dishIds))];
  if (dishIds.length === 0) {
    return true;
  }

  return isDishCatalogSynced() || getDishesByIds(dishIds).length > 0;
}

export function getDailyMenu(dateKey: string, mealType: MealType): DailyMenuEntry | null {
  return (
    loadKuhinjaJelovnikState().menus.find(
      (menu) => menu.dateKey === dateKey && menu.mealType === mealType,
    ) ?? null
  );
}

export function isDailyMenuPublished(dateKey: string, mealType: MealType): boolean {
  const menu = getSyncedDailyMenu(dateKey, mealType);
  return Boolean(menu?.published);
}

function normalizeDailyMenu(menu: DailyMenuEntry): DailyMenuEntry {
  return {
    ...menu,
    slots: menu.slots.map((slot) => normalizeMenuSlot(slot)),
  };
}

function normalizeMenuSlot(slot: DailyMenuSlot): DailyMenuSlot {
  const legacy = slot as DailyMenuSlot & { dishStock?: Record<string, number> };
  return {
    slotId: slot.slotId,
    dishIds: slot.dishIds,
    dishStock: Object.fromEntries(
      slot.dishIds.map((dishId) => [dishId, legacy.dishStock?.[dishId] ?? DEFAULT_DISH_STOCK]),
    ),
  };
}

function menuSlotsSignature(menu: DailyMenuEntry | null) {
  if (!menu) {
    return "";
  }

  return JSON.stringify({
    published: menu.published,
    slots: menu.slots.map((slot) => ({
      slotId: slot.slotId,
      dishIds: [...slot.dishIds].sort(),
      dishStock: slot.dishStock,
    })),
  });
}

export function hasUnsavedMenuChanges(dateKey: string, mealType: MealType) {
  if (!shouldUseMenusApi()) {
    return false;
  }

  const draft = getDailyMenu(dateKey, mealType);
  const synced = getSyncedDailyMenu(dateKey, mealType);
  return menuSlotsSignature(draft) !== menuSlotsSignature(synced);
}

function dishesToMealOptions(slot: DailyMenuSlot | undefined): MealOption[] {
  const dishIds = slot?.dishIds ?? [];
  return getActiveDishesByIds(dishIds)
    .map((dish) => {
      const stock = slot?.dishStock[dish.id] ?? DEFAULT_DISH_STOCK;
      const option = dishToMealOption(dish, stock);
      return {
        ...option,
        disabled: stock <= 0,
      };
    });
}

function buildMenuOptionsFromEntry(
  menu: DailyMenuEntry | null,
  requirePublished: boolean,
): Record<CreatorSlotId, MealOption[]> | null {
  if (!menu || (requirePublished && !menu.published)) {
    return null;
  }

  return creatorSlotOrder.reduce(
    (acc, slotId) => {
      const slot = menu.slots.find((entry) => entry.slotId === slotId);
      acc[slotId] = dishesToMealOptions(slot);
      return acc;
    },
    {} as Record<CreatorSlotId, MealOption[]>,
  );
}

export function getPublishedMenuOptions(
  dateKey: string,
  mealType: MealType,
): Record<CreatorSlotId, MealOption[]> | null {
  return buildMenuOptionsFromEntry(getSyncedDailyMenu(dateKey, mealType), true);
}

export function getEditorMenuOptions(
  dateKey: string,
  mealType: MealType,
): Record<CreatorSlotId, MealOption[]> | null {
  return buildMenuOptionsFromEntry(getDailyMenu(dateKey, mealType), false);
}

function mergeMenuEntryIntoState(
  state: KuhinjaJelovnikState | null,
  entry: DailyMenuEntry,
): KuhinjaJelovnikState {
  const normalized = normalizeDailyMenu(entry);
  if (!state) {
    return { menus: [normalized] };
  }

  const menus = state.menus.filter(
    (menu) => !(menu.dateKey === entry.dateKey && menu.mealType === entry.mealType),
  );
  return { menus: [...menus, normalized] };
}

function mergePublishedMenuEntry(entry: DailyMenuEntry) {
  remoteState = mergeMenuEntryIntoState(remoteState, entry);
  memoryState = mergeMenuEntryIntoState(memoryState, entry);
  notifyListeners();
}

export function upsertDailyMenu(entry: Omit<DailyMenuEntry, "updatedAt">) {
  mutateState((state) => {
    const menus = state.menus.filter((menu) => menu.id !== entry.id);
    return {
      menus: [
        ...menus,
        {
          ...entry,
          updatedAt: new Date().toISOString(),
        },
      ],
    };
  });
}

export async function publishMenu(dateKey: string, mealType: MealType) {
  const menu = getDailyMenu(dateKey, mealType);
  if (!menu) {
    throw new Error("Pripremite jelovnik pre objave.");
  }

  if (!shouldUseMenusApi()) {
    mutateState((state) => ({
      menus: state.menus.map((entry) =>
        entry.dateKey === dateKey && entry.mealType === mealType
          ? { ...entry, published: true, updatedAt: new Date().toISOString() }
          : entry,
      ),
    }));
    return;
  }

  const slotsPayload = Object.fromEntries(
    menu.slots.map((slot) => [
      slot.slotId,
      {
        dishIds: slot.dishIds,
        dishStock: slot.dishStock,
      },
    ]),
  );

  const response: MenuActionResponse = await postMenuAction({
    action: "publish_menu",
    dateKey,
    mealType,
    published: true,
    slots: slotsPayload,
  });

  if ("menu" in response && response.menu) {
    mergePublishedMenuEntry(response.menu);
    return;
  }

  if ("menus" in response) {
    remoteState = response;
    memoryState = cloneKuhinjaJelovnikState(response);
    notifyListeners();
  }
}

export async function publishScheduleMenus(
  meals: Array<{
    dateKey: string;
    mealType: MealType;
    slots: DailyMenuSlot[];
  }>,
) {
  if (meals.length === 0) {
    return;
  }

  if (!shouldUseMenusApi()) {
    const mealKeys = new Set(meals.map((meal) => `${meal.dateKey}:${meal.mealType}`));
    mutateState((state) => ({
      menus: state.menus.map((entry) =>
        mealKeys.has(`${entry.dateKey}:${entry.mealType}`)
          ? { ...entry, published: true, updatedAt: new Date().toISOString() }
          : entry,
      ),
    }));
    return;
  }

  const response: MenuActionResponse = await postMenuAction({
    action: "publish_schedule",
    meals: meals.map((meal) => ({
      dateKey: meal.dateKey,
      mealType: meal.mealType,
      slots: Object.fromEntries(
        meal.slots.map((slot) => [
          slot.slotId,
          {
            dishIds: slot.dishIds,
            dishStock: slot.dishStock,
          },
        ]),
      ),
    })),
  });

  if ("publishedMenus" in response) {
    for (const menu of response.publishedMenus) {
      mergePublishedMenuEntry(menu);
    }
    return;
  }

  if ("menus" in response) {
    remoteState = response;
    memoryState = cloneKuhinjaJelovnikState(response);
    notifyListeners();
  }
}

function applySlotDishToggleToState(
  state: KuhinjaJelovnikState,
  dateKey: string,
  mealType: MealType,
  slotId: KitchenMenuSlotId,
  dishId: string,
  selected: boolean,
): KuhinjaJelovnikState {
  const existing = state.menus.find((menu) => menu.dateKey === dateKey && menu.mealType === mealType);

  if (!existing) {
    if (!selected) {
      return state;
    }

    const newEntry: DailyMenuEntry = {
      id: `menu-${dateKey}-${mealType}`,
      dateKey,
      mealType,
      slots: kitchenSlotOrder.map((id) => ({
        slotId: id,
        dishIds: id === slotId ? [dishId] : [],
        dishStock: id === slotId ? { [dishId]: DEFAULT_DISH_STOCK } : {},
      })),
      published: false,
      updatedAt: new Date().toISOString(),
    };
    return { menus: [...state.menus, newEntry] };
  }

  return {
    menus: state.menus.map((menu) => {
      if (menu.dateKey !== dateKey || menu.mealType !== mealType) {
        return menu;
      }

      return {
        ...menu,
        slots: menu.slots.map((slot) => {
          if (slot.slotId !== slotId) {
            return slot;
          }

          const hasDish = slot.dishIds.includes(dishId);
          if (selected && !hasDish) {
            return {
              ...slot,
              dishIds: [...slot.dishIds, dishId],
              dishStock: {
                ...slot.dishStock,
                [dishId]: slot.dishStock[dishId] ?? DEFAULT_DISH_STOCK,
              },
            };
          }

          if (!selected && hasDish) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [dishId]: _disused, ...restStock } = slot.dishStock;
            return {
              ...slot,
              dishIds: slot.dishIds.filter((id) => id !== dishId),
              dishStock: restStock,
            };
          }

          return slot;
        }),
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function toggleSlotDish(
  dateKey: string,
  mealType: MealType,
  slotId: KitchenMenuSlotId,
  dishId: string,
  selected: boolean,
) {
  mutateState((state) => applySlotDishToggleToState(state, dateKey, mealType, slotId, dishId, selected));
}

export function setSlotDishIds(
  dateKey: string,
  mealType: MealType,
  slotId: KitchenMenuSlotId,
  dishIds: string[],
  previousStock?: Record<string, number>,
) {
  const uniqueDishIds = [...new Set(dishIds.filter(Boolean))];
  const dishStock = Object.fromEntries(
    uniqueDishIds.map((dishId) => [dishId, previousStock?.[dishId] ?? DEFAULT_DISH_STOCK]),
  );

  mutateState((state) => {
    const existing = state.menus.find(
      (menu) => menu.dateKey === dateKey && menu.mealType === mealType,
    );

    if (!existing) {
      const newEntry: DailyMenuEntry = {
        id: `menu-${dateKey}-${mealType}`,
        dateKey,
        mealType,
        slots: kitchenSlotOrder.map((id) => ({
          slotId: id,
          dishIds: id === slotId ? uniqueDishIds : [],
          dishStock: id === slotId ? dishStock : {},
        })),
        published: false,
        updatedAt: new Date().toISOString(),
      };
      return { menus: [...state.menus, newEntry] };
    }

    return {
      menus: state.menus.map((menu) => {
        if (menu.dateKey !== dateKey || menu.mealType !== mealType) {
          return menu;
        }

        return {
          ...menu,
          slots: menu.slots.map((slot) =>
            slot.slotId === slotId ? { slotId, dishIds: uniqueDishIds, dishStock } : slot,
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    };
  });
}

export function setSlotDishStock(
  dateKey: string,
  mealType: MealType,
  slotId: KitchenMenuSlotId,
  dishId: string,
  stock: number,
) {
  const quantity = Math.max(0, Math.floor(stock));

  mutateState((state) => ({
    menus: state.menus.map((menu) => {
      if (menu.dateKey !== dateKey || menu.mealType !== mealType) {
        return menu;
      }

      return {
        ...menu,
        slots: menu.slots.map((slot) => {
          if (slot.slotId !== slotId || !slot.dishIds.includes(dishId)) {
            return slot;
          }

          return {
            ...slot,
            dishStock: {
              ...slot.dishStock,
              [dishId]: quantity,
            },
          };
        }),
        updatedAt: new Date().toISOString(),
      };
    }),
  }));
}

export function copyMenuFromDate(
  sourceDateKey: string,
  targetDateKey: string,
  mealType: MealType,
) {
  const source = getDailyMenu(sourceDateKey, mealType);
  if (!source) {
    return;
  }

  upsertDailyMenu({
    id: `menu-${targetDateKey}-${mealType}`,
    dateKey: targetDateKey,
    mealType,
    slots: structuredClone(source.slots),
    published: false,
  });
}

export function copyMenuFromYesterday(targetDateKey: string, mealType: MealType) {
  copyMenuFromDate(addDays(targetDateKey, -1), targetDateKey, mealType);
}

export function copyMenuFromLastWeek(targetDateKey: string, mealType: MealType) {
  copyMenuFromDate(addDays(targetDateKey, -7), targetDateKey, mealType);
}

export function ensureDailyMenu(dateKey: string, mealType: MealType): DailyMenuEntry {
  const existing = getDailyMenu(dateKey, mealType);
  if (existing) {
    return existing;
  }

  const entry: DailyMenuEntry = {
    id: `menu-${dateKey}-${mealType}`,
    dateKey,
    mealType,
    slots: kitchenSlotOrder.map((slotId) => ({
      slotId,
      dishIds: [],
      dishStock: {},
    })),
    published: false,
    updatedAt: new Date().toISOString(),
  };

  upsertDailyMenu(entry);
  return getDailyMenu(dateKey, mealType) ?? entry;
}

export function getMenuKey(dateKey: string, mealType: MealType) {
  return menuKey(dateKey, mealType);
}

export function getMenuDishNames(dateKey: string, mealType: MealType): string[] {
  const menu = getDailyMenu(dateKey, mealType);
  if (!menu) {
    return [];
  }

  const ids = menu.slots.flatMap((slot) => slot.dishIds);
  return getDishesByIds(ids).map((dish) => dish.name);
}
