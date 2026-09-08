import type { AuditKind } from "@/lib/audit-trail";
import { ADMIN_SESSION_STORAGE_KEY, type AdminSession } from "@/hooks/useAdminSession";

export const AUDIT_TRAIL_STORAGE_KEY = "emenza-audit-trail";
export const AUDIT_TRAIL_DEMO_VERSION = 1;

export type AdminAuditRecord = {
  id: string;
  kind: AuditKind;
  actionType: string;
  author: string;
  role: string | null;
  message: string;
  /** ISO vremenska oznaka događaja. */
  at: string;
};

const MAX_RECORDS = 200;

type StoredAuditStore = { demoVersion?: number; records: AdminAuditRecord[] };

type AuditTrailListener = () => void;

const listeners = new Set<AuditTrailListener>();

let memoryRecords: AdminAuditRecord[] | null = null;

function currentAdminSession(): AdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw) as AdminSession;
      if (session?.displayName) {
        return session;
      }
    }
  } catch {
    // ignore malformed session
  }
  return null;
}

function readStorage(): { records: AdminAuditRecord[] } {
  if (typeof window === "undefined") {
    return { records: [] };
  }
  try {
    const raw = localStorage.getItem(AUDIT_TRAIL_STORAGE_KEY);
    if (!raw) {
      return { records: [] };
    }
    const parsed = JSON.parse(raw) as StoredAuditStore;
    return { records: parsed.records ?? [] };
  } catch {
    return { records: [] };
  }
}

function writeStorage(records: AdminAuditRecord[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: StoredAuditStore = { demoVersion: AUDIT_TRAIL_DEMO_VERSION, records };
    localStorage.setItem(AUDIT_TRAIL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage write errors
  }
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  }
}

/** Hydrira audit store iz localStorage (i prati admin sistem kako bi odmah dobila sveža stanja). */
export function hydrateAuditTrailFromStorage() {
  const { records } = readStorage();
  memoryRecords = records;
}

export function loadAuditRecords(): AdminAuditRecord[] {
  if (!memoryRecords) {
    memoryRecords = readStorage().records;
  }
  return memoryRecords;
}

export function subscribeAuditTrail(listener: AuditTrailListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Zabeleži admin akciju u klijentski audit trail (radi i u demo i backend režimu).
 *  Beleži se samo kada je aktivan admin session (ne referent/kuhinja). */
export function recordAdminAudit(input: {
  kind: AuditKind;
  actionType: string;
  message: string;
  at?: string;
}): boolean {
  const session = currentAdminSession();
  if (!session) {
    return false;
  }
  const records = loadAuditRecords();
  const now = input.at ?? new Date().toISOString();
  const record: AdminAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    actionType: input.actionType,
    author: session.displayName,
    role: "admin",
    message: input.message,
    at: now,
  };
  const next = [record, ...records].slice(0, MAX_RECORDS);
  writeStorage(next);
  memoryRecords = next;
  notifyListeners();
  return true;
}

// Cross-tab sync i inicijalna hidratacija.
if (typeof window !== "undefined") {
  hydrateAuditTrailFromStorage();
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === AUDIT_TRAIL_STORAGE_KEY) {
      hydrateAuditTrailFromStorage();
      notifyListeners();
    }
  });
}
