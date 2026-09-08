import type { WeeklySchedule } from "@/lib/kuhinja-weekly-schedule";

export const KUHINJA_WEEKLY_SCHEDULE_STORAGE_KEY = "emenza-kuhinja-weekly-schedule";

type WeeklyScheduleStore = Record<string, WeeklySchedule>;
type WeeklyScheduleListener = () => void;

const listeners = new Set<WeeklyScheduleListener>();
let memoryStore: WeeklyScheduleStore = {};

function readPersistedStore(): WeeklyScheduleStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(KUHINJA_WEEKLY_SCHEDULE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as WeeklyScheduleStore;
  } catch {
    return {};
  }
}

function writePersistedStore(store: WeeklyScheduleStore) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(KUHINJA_WEEKLY_SCHEDULE_STORAGE_KEY, JSON.stringify(store));
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function hydrateWeeklyScheduleFromStorage(options?: { notify?: boolean }) {
  memoryStore = { ...readPersistedStore() };
  if (options?.notify !== false) {
    notifyListeners();
  }
  return Object.keys(memoryStore).length > 0;
}

export function loadWeeklySchedule(weekStartDateKey: string): WeeklySchedule | null {
  if (memoryStore[weekStartDateKey]) {
    return memoryStore[weekStartDateKey];
  }

  const persisted = readPersistedStore()[weekStartDateKey];
  if (persisted) {
    memoryStore = { ...memoryStore, [weekStartDateKey]: persisted };
    return persisted;
  }

  return null;
}

export function saveWeeklySchedule(schedule: WeeklySchedule, options?: { notify?: boolean }) {
  memoryStore = { ...memoryStore, [schedule.weekStartDateKey]: schedule };
  writePersistedStore(memoryStore);
  if (options?.notify !== false) {
    notifyListeners();
  }
}

export function clearWeeklySchedule(weekStartDateKey: string, options?: { notify?: boolean }) {
  const nextStore = { ...memoryStore };
  delete nextStore[weekStartDateKey];
  memoryStore = nextStore;

  const persisted = readPersistedStore();
  delete persisted[weekStartDateKey];
  writePersistedStore(persisted);

  if (options?.notify !== false) {
    notifyListeners();
  }
}

export function subscribeWeeklySchedule(listener: WeeklyScheduleListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
