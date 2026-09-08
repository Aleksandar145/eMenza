import type { KitchenCounterManualOverride } from "@/lib/kitchen-counter-queue";

export const COUNTER_QUEUE_STORAGE_KEY = "emenza:counter-queue";

export type CounterQueuePersistedState = {
  timestamps: number[];
  manualOverride: KitchenCounterManualOverride | null;
};

const emptyState: CounterQueuePersistedState = {
  timestamps: [],
  manualOverride: null,
};

type CounterQueueListener = () => void;

const listeners = new Set<CounterQueueListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function parseStoredState(raw: string | null): CounterQueuePersistedState {
  if (!raw) {
    return emptyState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CounterQueuePersistedState>;
    return {
      timestamps: Array.isArray(parsed.timestamps)
        ? parsed.timestamps.filter((value) => typeof value === "number")
        : [],
      manualOverride:
        parsed.manualOverride &&
        typeof parsed.manualOverride.level === "string" &&
        typeof parsed.manualOverride.expiresAt === "number"
          ? parsed.manualOverride
          : null,
    };
  } catch {
    return emptyState;
  }
}

export function readCounterQueueState(): CounterQueuePersistedState {
  if (typeof window === "undefined") {
    return emptyState;
  }

  return parseStoredState(localStorage.getItem(COUNTER_QUEUE_STORAGE_KEY));
}

export function writeCounterQueueState(state: CounterQueuePersistedState) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(COUNTER_QUEUE_STORAGE_KEY, JSON.stringify(state));
  notifyListeners();
}

export function subscribeCounterQueue(listener: CounterQueueListener) {
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === COUNTER_QUEUE_STORAGE_KEY) {
      listener();
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}
