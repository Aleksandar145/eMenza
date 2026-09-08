import {
  createManualOverride,
  getEffectiveQueueLevel,
  recordLookupTimestamp,
  type KitchenCounterManualOverride,
  type KitchenCounterQueueLevel,
} from "@/lib/kitchen-counter-queue";

type CounterQueueServerState = {
  timestamps: number[];
  manualOverride: KitchenCounterManualOverride | null;
};

const globalForCounterQueue = globalThis as unknown as {
  emenzaCounterQueue?: CounterQueueServerState;
};

function getState(): CounterQueueServerState {
  if (!globalForCounterQueue.emenzaCounterQueue) {
    globalForCounterQueue.emenzaCounterQueue = {
      timestamps: [],
      manualOverride: null,
    };
  }

  return globalForCounterQueue.emenzaCounterQueue;
}

export function getCounterQueueSnapshot(now = Date.now()) {
  const state = getState();
  const snapshot = getEffectiveQueueLevel(state.timestamps, state.manualOverride, now);

  return {
    level: snapshot.level,
    source: snapshot.source,
    count: snapshot.count,
    manualExpiresAt: snapshot.manualOverride?.expiresAt ?? null,
    timestamps: [...state.timestamps],
    manualOverride: state.manualOverride,
  };
}

export function recordCounterQueueLookup(now = Date.now()) {
  const state = getState();
  state.timestamps = recordLookupTimestamp(state.timestamps, now);
  return getCounterQueueSnapshot(now);
}

export function setCounterQueueManualLevel(level: KitchenCounterQueueLevel, now = Date.now()) {
  const state = getState();
  state.manualOverride = createManualOverride(level, now);
  return getCounterQueueSnapshot(now);
}

export function clearCounterQueueManualOverride(now = Date.now()) {
  const state = getState();
  state.manualOverride = null;
  return getCounterQueueSnapshot(now);
}

export function applyCounterQueuePersistedState(
  timestamps: number[],
  manualOverride: KitchenCounterManualOverride | null,
  now = Date.now(),
) {
  const state = getState();
  state.timestamps = timestamps;
  state.manualOverride = manualOverride;
  return getCounterQueueSnapshot(now);
}
