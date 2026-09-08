import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import type {
  KitchenCounterManualOverride,
  KitchenCounterQueueLevel,
} from "@/lib/kitchen-counter-queue";

export type CounterQueueApiSnapshot = {
  level: KitchenCounterQueueLevel;
  source: "auto" | "manual";
  count: number;
  manualExpiresAt: number | null;
  timestamps?: number[];
  manualOverride?: KitchenCounterManualOverride | null;
};

export function shouldUseCounterQueueApi() {
  return isClientBackendEnabled();
}

export async function fetchCounterQueueFromApi() {
  return apiGet<CounterQueueApiSnapshot>("/api/kitchen/counter-queue");
}

export async function patchCounterQueueManualLevel(level: KitchenCounterQueueLevel) {
  return apiPatch<CounterQueueApiSnapshot>("/api/kitchen/counter-queue", { level });
}

export async function patchCounterQueueClearManual() {
  return apiPatch<CounterQueueApiSnapshot>("/api/kitchen/counter-queue", { clearManual: true });
}

export async function postCounterQueueLookup() {
  return apiPost<CounterQueueApiSnapshot>("/api/kitchen/counter-queue", { action: "lookup" });
}
