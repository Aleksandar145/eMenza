import {
  cloneMagacinState,
  createInitialMagacinState,
  magacinDemoVersion,
  magacinStorageKey,
  type Ingredient,
  type IngredientCategory,
  type IngredientType,
  type IngredientUnit,
  type MagacinState,
  type ProcurementReport,
  type ProcurementReportItem,
} from "@/lib/magacin-mock";
import { ApiError } from "@/lib/api/client";
import {
  deleteMagacinViaApi,
  fetchMagacinFromApi,
  shouldUseMagacinApi,
  upsertIngredientViaApi,
  upsertReportViaApi,
} from "@/lib/backend/magacin-api";

type StoredMagacin = MagacinState & { demoVersion?: number };

type MagacinListener = () => void;

const listeners = new Set<MagacinListener>();
let memoryState: MagacinState | null = null;
let remoteState: MagacinState | null = null;
let _generation = 0;

export function getMagacinGeneration() {
  return _generation;
}

function bumpGeneration() {
  _generation++;
}

const emptyMagacinState: MagacinState = { ingredients: [], reports: [] };

export function isMagacinSynced() {
  return !shouldUseMagacinApi() || remoteState !== null;
}

export function isMagacinHydratedForKitchenUI() {
  if (!shouldUseMagacinApi()) {
    return true;
  }
  return remoteState !== null || memoryState !== null;
}

let magacinSyncPromise: Promise<{ ok: boolean; error?: string }> | null = null;

function hydrateMagacinFromSessionCache(options?: { notify?: boolean }) {
  const cached = readMagacinCache();
  if (!cached) {
    return false;
  }
  remoteState = cloneMagacinState(cached);
  memoryState = cloneMagacinState(cached);
  if (options?.notify !== false) {
    notifyListeners();
  }
  return true;
}

export function hydrateMagacinFromCache(options?: { notify?: boolean }) {
  return hydrateMagacinFromSessionCache(options);
}

function readMagacinCache(): MagacinState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(storageKeyForMagacin());
    return raw ? ((JSON.parse(raw) as StoredMagacin) as MagacinState) : null;
  } catch {
    return null;
  }
}

function writeMagacinCache(state: MagacinState) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(storageKeyForMagacin(), JSON.stringify(state));
  } catch {
    // noop
  }
}

function storageKeyForMagacin() {
  return "emenza-magacin-cache";
}

export function mergeRemoteMagacin(incoming: MagacinState) {
  if (!shouldUseMagacinApi()) {
    return;
  }
  setRemoteData(incoming);
  if (remoteState) writeMagacinCache(remoteState);
  notifyListeners();
}

export function resetMagacinSync() {
  magacinSyncPromise = null;
}

export async function syncMagacinFromApi(): Promise<{ ok: boolean; error?: string }> {
  if (!shouldUseMagacinApi()) {
    return { ok: true };
  }

  if (magacinSyncPromise) {
    return magacinSyncPromise;
  }

  if (!remoteState) {
    hydrateMagacinFromSessionCache();
  }

  magacinSyncPromise = (async (): Promise<{ ok: boolean; error?: string }> => {
    const generationAtStart = getMagacinGeneration();
    try {
      const fetched = await fetchMagacinFromApi();
      // Ako se lokalno stanje promenilo dok je fetch trajao (npr. korisnik je
      // upravo kreirao izveštaj), ne pregaži ga zastarelim snapshotom — ostavi
      // da CRUD-ova sopstvena reconciliacija (setRemoteData) vrati sveže stanje.
      if (getMagacinGeneration() === generationAtStart) {
        setRemoteData(fetched);
        if (remoteState) writeMagacinCache(remoteState);
        notifyListeners();
      }
      return { ok: true };
    } catch (error) {
      const hadCache = Boolean(remoteState);
      const isTimeout = error instanceof ApiError && error.status === 408;

      if (isTimeout && hadCache) {
        console.warn("[magacin] sync timed out; using cached data");
        return { ok: true };
      }

      console.error("[magacin] sync failed", error);
      const message = error instanceof Error ? error.message : "Nepoznata greška";

      if (!remoteState) {
        remoteState = cloneMagacinState(emptyMagacinState);
        notifyListeners();
      }

      return { ok: false, error: message };
    } finally {
      magacinSyncPromise = null;
    }
  })();

  return magacinSyncPromise;
}

function withDemoVersion(state: MagacinState): StoredMagacin {
  return { ...state, demoVersion: magacinDemoVersion };
}

function notifyListeners() {
  bumpGeneration();
  listeners.forEach((listener) => listener());
}

function setRemoteData(state: MagacinState | null) {
  if (!state) return;
  memoryState = cloneMagacinState(state);
  remoteState = cloneMagacinState(state);
}

function persistLocalState(state: MagacinState) {
  memoryState = cloneMagacinState(state);
  if (typeof window !== "undefined" && !shouldUseMagacinApi()) {
    try {
      localStorage.setItem(magacinStorageKey, JSON.stringify(withDemoVersion(state)));
    } catch {
      // noop
    }
  }
  notifyListeners();
}

export function loadMagacinState(): MagacinState {
  if (memoryState) {
    return cloneMagacinState(memoryState);
  }

  if (remoteState) {
    return cloneMagacinState(remoteState);
  }

  if (shouldUseMagacinApi()) {
    return cloneMagacinState(emptyMagacinState);
  }

  if (typeof window === "undefined") {
    return createInitialMagacinState();
  }

  try {
    const raw = localStorage.getItem(magacinStorageKey);
    if (!raw) {
      const initial = createInitialMagacinState();
      memoryState = initial;
      return cloneMagacinState(initial);
    }

    const parsed = JSON.parse(raw) as StoredMagacin;
    if (parsed.demoVersion !== magacinDemoVersion) {
      const initial = createInitialMagacinState();
      persistLocalState(initial);
      return cloneMagacinState(initial);
    }

    memoryState = {
      ingredients: parsed.ingredients ?? createInitialMagacinState().ingredients,
      reports: parsed.reports ?? [],
    };
    return cloneMagacinState(memoryState);
  } catch {
    const initial = createInitialMagacinState();
    memoryState = initial;
    return cloneMagacinState(initial);
  }
}

export function subscribeMagacin(listener: MagacinListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function mutateState(mutator: (state: MagacinState) => MagacinState) {
  const next = mutator(loadMagacinState());
  persistLocalState(next);
}

export type CreateIngredientInput = {
  name: string;
  category: IngredientCategory;
  unit: IngredientUnit;
  ingredientType: IngredientType;
  currentStock?: number;
  minStock?: number;
};

function nextIngredientId(state: MagacinState, name: string) {
  const base = `ing-${slugifyId(name)}`;
  if (!state.ingredients.some((ing) => ing.id === base)) {
    return base;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function createIngredient(input: CreateIngredientInput) {
  const now = new Date().toISOString();
  const state = loadMagacinState();
  const ingredient: Ingredient = {
    id: nextIngredientId(state, input.name),
    name: input.name.trim(),
    category: input.category,
    unit: input.unit,
    ingredientType: input.ingredientType,
    currentStock: Math.max(0, input.currentStock ?? 0),
    minStock: Math.max(0, input.minStock ?? 0),
    createdAt: now,
    updatedAt: now,
  };

  mutateState((s) => ({
    ...s,
    ingredients: [...s.ingredients, ingredient],
  }));

  if (remoteState) {
    remoteState = { ...remoteState, ingredients: [...remoteState.ingredients, ingredient] };
    notifyListeners();
  }

  if (shouldUseMagacinApi()) {
    void upsertIngredientViaApi({
      id: undefined,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      ingredientType: ingredient.ingredientType,
      currentStock: ingredient.currentStock,
      minStock: ingredient.minStock,
    })
      .then((state) => {
        setRemoteData(state);
        if (remoteState) writeMagacinCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }

  return ingredient;
}

export function updateIngredient(
  id: string,
  patch: Partial<Omit<Ingredient, "id" | "createdAt">>,
) {
  const state = loadMagacinState();
  const existing = state.ingredients.find((ing) => ing.id === id);
  if (!existing) return;

  const updated: Ingredient = {
    ...existing,
    ...patch,
    name: patch.name?.trim() ?? existing.name,
    currentStock: patch.currentStock != null ? Math.max(0, patch.currentStock) : existing.currentStock,
    minStock: patch.minStock != null ? Math.max(0, patch.minStock) : existing.minStock,
    updatedAt: new Date().toISOString(),
  };

  mutateState((s) => ({
    ...s,
    ingredients: s.ingredients.map((ing) => (ing.id === id ? updated : ing)),
  }));

  if (remoteState) {
    remoteState = {
      ...remoteState,
      ingredients: remoteState.ingredients.map((ing) => (ing.id === id ? updated : ing)),
    };
    notifyListeners();
  }

  if (shouldUseMagacinApi()) {
    void upsertIngredientViaApi({
      id: updated.id,
      name: updated.name,
      category: updated.category,
      unit: updated.unit,
      ingredientType: updated.ingredientType,
      currentStock: updated.currentStock,
      minStock: updated.minStock,
    })
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeMagacinCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }
}

export function adjustStock(id: string, delta: number) {
  const state = loadMagacinState();
  const existing = state.ingredients.find((ing) => ing.id === id);
  if (!existing) return;
  updateIngredient(id, { currentStock: existing.currentStock + delta });
}

export function deleteIngredient(id: string) {
  mutateState((s) => ({ ...s, ingredients: s.ingredients.filter((ing) => ing.id !== id) }));

  if (remoteState) {
    remoteState = { ...remoteState, ingredients: remoteState.ingredients.filter((ing) => ing.id !== id) };
    notifyListeners();
  }

  if (shouldUseMagacinApi()) {
    void deleteMagacinViaApi("ingredient", id)
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeMagacinCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }
}

function uuidv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nextReportId(state: MagacinState) {
  let id = uuidv4();
  while (state.reports.some((r) => r.id === id)) {
    id = uuidv4();
  }
  return id;
}

export type CreateReportInput = {
  dateKey: string;
  label: string;
  supplier?: string;
  createdBy: string;
};

export function createReport(input: CreateReportInput) {
  const now = new Date().toISOString();
  const state = loadMagacinState();
  const report: ProcurementReport = {
    id: nextReportId(state),
    dateKey: input.dateKey,
    label: input.label.trim(),
    supplier: input.supplier?.trim() || undefined,
    status: "draft",
    items: [],
    totalRsd: 0,
    createdBy: input.createdBy,
    createdAt: now,
  };

  mutateState((s) => ({ ...s, reports: [...s.reports, report] }));

  if (remoteState) {
    remoteState = { ...remoteState, reports: [...remoteState.reports, report] };
    notifyListeners();
  }

  if (shouldUseMagacinApi()) {
    void upsertReportViaApi({
      id: report.id,
      dateKey: report.dateKey,
      label: report.label,
      supplier: report.supplier,
      status: "draft",
      totalRsd: 0,
      createdBy: report.createdBy,
      items: [],
    })
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeMagacinCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }

  return report;
}

export function updateReport(report: ProcurementReport) {
  mutateState((s) => ({
    ...s,
    reports: s.reports.map((r) => (r.id === report.id ? { ...report } : r)),
  }));

  if (remoteState) {
    remoteState = {
      ...remoteState,
      reports: remoteState.reports.map((r) => (r.id === report.id ? { ...report } : r)),
    };
    notifyListeners();
  }

  if (shouldUseMagacinApi()) {
    void upsertReportViaApi({
      id: report.id,
      dateKey: report.dateKey,
      label: report.label,
      supplier: report.supplier,
      status: report.status,
      totalRsd: report.totalRsd,
      createdBy: report.createdBy,
      finalizedAt: report.finalizedAt,
      items: report.items,
    })
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeMagacinCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }
}

export function addReportItem(reportId: string, item: ProcurementReportItem) {
  const state = loadMagacinState();
  const report = state.reports.find((r) => r.id === reportId);
  if (!report || report.status === "finalized") return;

  updateReport({
    ...report,
    items: [...report.items, item],
    totalRsd: computeTotal(report.items.concat(item)),
  });
}

export function updateReportItem(reportId: string, itemId: string, patch: Partial<ProcurementReportItem>) {
  const state = loadMagacinState();
  const report = state.reports.find((r) => r.id === reportId);
  if (!report || report.status === "finalized") return;

  const items = report.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
  updateReport({ ...report, items, totalRsd: computeTotal(items) });
}

export function removeReportItem(reportId: string, itemId: string) {
  const state = loadMagacinState();
  const report = state.reports.find((r) => r.id === reportId);
  if (!report || report.status === "finalized") return;

  const items = report.items.filter((it) => it.id !== itemId);
  updateReport({ ...report, items, totalRsd: computeTotal(items) });
}

export interface FinalizeReportResult {
  booked: number;
  linked: number;
  skipped: number;
}

export function finalizeReport(report: ProcurementReport): FinalizeReportResult | null {
  if (report.status === "finalized") return null;

  const state = loadMagacinState();
  const persisted = state.reports.find((r) => r.id === report.id);
  if (!persisted || persisted.status === "finalized") return null;

  const quantityById = new Map<string, number>();
  for (const item of report.items) {
    if (!item.ingredientId || !item.quantity || item.quantity <= 0) continue;
    const existing = state.ingredients.find((ing) => ing.id === item.ingredientId);
    if (!existing) continue;
    quantityById.set(item.ingredientId, (quantityById.get(item.ingredientId) ?? 0) + item.quantity);
  }

  for (const [ingredientId, qty] of quantityById) {
    adjustStock(ingredientId, qty);
  }

  updateReport({
    ...report,
    status: "finalized",
    finalizedAt: new Date().toISOString(),
    totalRsd: computeTotal(report.items),
  });

  return {
    booked: quantityById.size,
    linked: report.items.filter((it) => it.ingredientId).length,
    skipped: report.items.filter((it) => !it.ingredientId).length,
  };
}

export function deleteReport(reportId: string) {
  mutateState((s) => ({ ...s, reports: s.reports.filter((r) => r.id !== reportId) }));

  if (remoteState) {
    remoteState = { ...remoteState, reports: remoteState.reports.filter((r) => r.id !== reportId) };
    notifyListeners();
  }

  if (shouldUseMagacinApi()) {
    void deleteMagacinViaApi("report", reportId)
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeMagacinCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }
}

export function computeTotal(items: ProcurementReportItem[]) {
  return items.reduce((sum, item) => sum + item.amountRsd, 0);
}

export function getLowStockIngredients(): Ingredient[] {
  return loadMagacinState().ingredients.filter((ing) => ing.currentStock < ing.minStock);
}

function slugifyId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
