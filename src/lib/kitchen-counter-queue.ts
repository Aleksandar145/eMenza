export type KitchenCounterQueueLevel = "calm" | "busy" | "crowded";

export const QUEUE_WINDOW_MS = 60_000;
export const QUEUE_CALM_MAX = 4;
export const QUEUE_BUSY_MAX = 7;
export const MANUAL_OVERRIDE_MS = 80_000;
export const QUEUE_TICK_MS = 10_000;

export const QUEUE_STATUS_HELP = {
  autoTitle: "Kako softver bira stanje",
  autoBody:
    "Broji sva učitavanja kartica u poslednjih 60 sekundi (ručni unos i QR). Do 4 — Mirno, 5–7 — Prometno, 8 i više — Gužva.",
  manualBody: "Možete ručno izabrati stanje; važi 80 sekundi, zatim se vraća automatski režim.",
  responsibility:
    "Budite odgovorni i obaveštavajte studente tačnim informacijama o stanju u redu.",
} as const;

export type KitchenCounterQueueSource = "auto" | "manual";

export type KitchenCounterManualOverride = {
  level: KitchenCounterQueueLevel;
  expiresAt: number;
};

export type KitchenCounterQueueSnapshot = {
  level: KitchenCounterQueueLevel;
  source: KitchenCounterQueueSource;
  count: number;
  manualOverride: KitchenCounterManualOverride | null;
};

export function computeQueueLevelFromCount(count: number): KitchenCounterQueueLevel {
  if (count <= QUEUE_CALM_MAX) {
    return "calm";
  }

  if (count <= QUEUE_BUSY_MAX) {
    return "busy";
  }

  return "crowded";
}

export function pruneLookupTimestamps(timestamps: number[], now = Date.now()): number[] {
  const cutoff = now - QUEUE_WINDOW_MS;
  return timestamps.filter((timestamp) => timestamp >= cutoff);
}

export function resolveManualOverride(
  manualOverride: KitchenCounterManualOverride | null,
  now = Date.now(),
): KitchenCounterManualOverride | null {
  if (!manualOverride || manualOverride.expiresAt <= now) {
    return null;
  }

  return manualOverride;
}

export function createManualOverride(
  level: KitchenCounterQueueLevel,
  now = Date.now(),
): KitchenCounterManualOverride {
  return {
    level,
    expiresAt: now + MANUAL_OVERRIDE_MS,
  };
}

export function getEffectiveQueueLevel(
  timestamps: number[],
  manualOverride: KitchenCounterManualOverride | null,
  now = Date.now(),
): KitchenCounterQueueSnapshot {
  const pruned = pruneLookupTimestamps(timestamps, now);
  const count = pruned.length;
  const autoLevel = computeQueueLevelFromCount(count);
  const activeOverride = resolveManualOverride(manualOverride, now);

  if (activeOverride) {
    return {
      level: activeOverride.level,
      source: "manual",
      count,
      manualOverride: activeOverride,
    };
  }

  return {
    level: autoLevel,
    source: "auto",
    count,
    manualOverride: null,
  };
}

export function recordLookupTimestamp(timestamps: number[], now = Date.now()): number[] {
  return pruneLookupTimestamps([...timestamps, now], now);
}

export function formatManualOverrideRemaining(expiresAt: number, now = Date.now()): string {
  const remainingMs = Math.max(0, expiresAt - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  if (remainingSeconds < 120) {
    return `${remainingSeconds} sek`;
  }

  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  return `${remainingMinutes} min`;
}

export type QueueLevelConfig = {
  id: KitchenCounterQueueLevel;
  label: string;
  dotClass: string;
  activeContainerClass: string;
  inactiveContainerClass: string;
  chipClass: string;
  heroChipClass: string;
};

export const QUEUE_LEVELS: QueueLevelConfig[] = [
  {
    id: "calm",
    label: "Mirno",
    dotClass: "bg-[#5055D2]",
    activeContainerClass: "border-[#5055D2]/35 bg-[#5055D2]/12 shadow-[0_0_0_1px_rgba(80,85,210,0.12)]",
    inactiveContainerClass: "border-black/5 bg-black/[0.02]",
    chipClass: "border-[#5055D2]/25 bg-[#5055D2]/10 text-[#5055D2]",
    heroChipClass: "border-white/30 bg-white/15 text-white",
  },
  {
    id: "busy",
    label: "Prometno",
    dotClass: "bg-amber-400",
    activeContainerClass: "border-amber-300 bg-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]",
    inactiveContainerClass: "border-black/5 bg-black/[0.02]",
    chipClass: "border-amber-200 bg-amber-50 text-amber-900",
    heroChipClass: "border-amber-200/60 bg-amber-400/20 text-white",
  },
  {
    id: "crowded",
    label: "Gužva",
    dotClass: "bg-red-500",
    activeContainerClass: "border-red-300 bg-red-50 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]",
    inactiveContainerClass: "border-black/5 bg-black/[0.02]",
    chipClass: "border-red-200 bg-red-50 text-red-700",
    heroChipClass: "border-red-200/60 bg-red-500/25 text-white",
  },
];

export function getQueueLevelConfig(level: KitchenCounterQueueLevel): QueueLevelConfig {
  return QUEUE_LEVELS.find((entry) => entry.id === level) ?? QUEUE_LEVELS[0];
}
