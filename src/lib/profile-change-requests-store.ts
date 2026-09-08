import { isClientBackendEnabled } from "@/lib/backend-config";
import { apiGetData, apiPost } from "@/lib/api/client";

export type ProfileChangeRequest = {
  id: string;
  email: string;
  studentName: string;
  cardNumber: string;
  status: "pending" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  referentName?: string;
};

const STORAGE_KEY = "emenza-profile-change-requests";

type StorageData = {
  requests: ProfileChangeRequest[];
};

function loadAll(): ProfileChangeRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as StorageData;
    return data.requests ?? [];
  } catch {
    return [];
  }
}

function saveAll(requests: ProfileChangeRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests }));
}

function normalizeCardNumber(v: string): string {
  return v.replace(/\D/g, "");
}

function cardNumberMatch(a: string, b: string): boolean {
  const da = normalizeCardNumber(a);
  const db = normalizeCardNumber(b);
  if (!da || !db) return false;
  return da === db || (da.length >= 4 && db.endsWith(da)) || (db.length >= 4 && da.endsWith(db));
}

export async function submitProfileChangeRequestAsync(
  email: string,
  studentName: string,
  cardNumber: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isClientBackendEnabled()) {
    try {
      const data = await apiPost<{ request: ProfileChangeRequest }>("/api/profile-change-requests", {
        email,
        studentName,
        cardNumber,
      });

      const request = data.request;
      saveAll([request, ...loadAll()]);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Slanje zahteva nije uspelo.";
      return { ok: false, error: message };
    }
  }

  const request: ProfileChangeRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email,
    studentName,
    cardNumber,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  saveAll([request, ...loadAll()]);
  return { ok: true };
}

export function getPendingRequestForCardNumber(cardNumber: string): ProfileChangeRequest | undefined {
  return loadAll().find((r) => cardNumberMatch(r.cardNumber, cardNumber) && r.status === "pending");
}

export function getAllPendingRequests(): ProfileChangeRequest[] {
  return loadAll().filter((r) => r.status === "pending");
}

export function getAllRequests(): ProfileChangeRequest[] {
  return loadAll();
}

export function resolveProfileChangeRequest(
  requestId: string,
  referentName: string,
): ProfileChangeRequest | undefined {
  const all = loadAll();
  const idx = all.findIndex((r) => r.id === requestId);
  if (idx === -1) return undefined;

  const updated: ProfileChangeRequest = {
    ...all[idx],
    status: "resolved",
    resolvedAt: new Date().toISOString(),
    referentName,
  };

  all[idx] = updated;
  saveAll(all);

  if (isClientBackendEnabled()) {
    apiPost(`/api/profile-change-requests/${requestId}`, {
      action: "resolve",
      referentName,
    }).catch(() => {});
  }

  return updated;
}

export async function fetchPendingRequestsFromApi(): Promise<ProfileChangeRequest[]> {
  if (!isClientBackendEnabled()) return getAllPendingRequests();
  try {
    const data = await apiGetData<{ requests: ProfileChangeRequest[] }>("/api/profile-change-requests");
    if (data.requests) {
      saveAll(data.requests);
      return data.requests;
    }
    return getAllPendingRequests();
  } catch {
    return getAllPendingRequests();
  }
}
