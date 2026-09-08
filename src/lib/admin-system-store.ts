import {
  cloneAdminSystemState,
  createInitialAdminSystemState,
  type AdminSystemState,
  type ClosedDateEntry,
  type ComplaintEntry,
  type ComplaintStatus,
  type EmployeeRole,
  type FeedbackEntry,
  type MealPriceConfig,
  type NoticeTarget,
  type PublishedNotice,
  type StaffMember,
  isKitchenEmployeeRole,
  mapEmployeeRoleToKitchenRole,
} from "@/lib/admin-system-mock";
import type { WorkingHoursRow } from "@/lib/meal-types";
import {
  createKitchenEmployee,
  deleteKitchenEmployee,
  updateKitchenEmployeePassword,
} from "@/lib/kuhinja-staff-store";
import type { NotificationItem } from "@/lib/obavestenja-mock";
import type { ReferentAdminNotice } from "@/lib/referent-notifications-mock";
import {
  archiveNoticeFromApi,
  clearFeedbackReplyFromApi,
  deleteFeedbackEntryFromApi,
  deleteStaffFromApi,
  fetchAdminFromApi,
  inviteStaffToApi,
  markFeedbackReviewedFromApi,
  patchAdminFromApi,
  publishNoticeToApi,
  shouldUseAdminApi,
  upsertStaffListToApi,
  type AdminApiScope,
} from "@/lib/backend/admin-api";
import { ApiError } from "@/lib/api/client";
import { recordAdminAudit } from "@/lib/audit-trail-store";

export const ADMIN_SYSTEM_STORAGE_KEY = "emenza-admin-system";
export const ADMIN_SYSTEM_DEMO_VERSION = 3;

type StoredAdminSystem = AdminSystemState & { demoVersion?: number };

type AdminSystemListener = () => void;

const listeners = new Set<AdminSystemListener>();
let memoryState: AdminSystemState | null = null;
let remoteState: AdminSystemState | null = null;
let storageHydrated = false;
let syncInFlight: Promise<void> | null = null;
let lastSyncAt = 0;
let lastSyncScope: AdminApiScope | null = null;
let syncFailed = false;
let isSyncing = false;
let lastSyncError: "timeout" | "network" | null = null;
let hasSuccessfulRemoteSync = false;

// Cross-tab sync: when localStorage changes in another tab, re-read into memoryState
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === ADMIN_SYSTEM_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as Partial<StoredAdminSystem>;
        if (parsed.demoVersion === ADMIN_SYSTEM_DEMO_VERSION) {
          // Merge external changes into memoryState without losing local unsaved changes
          const incoming = readAdminSystemFromStorage();
          // Only update publishedNotices and staff from external changes
          // (other config fields are admin-only and rarely change between tabs)
          if (memoryState) {
            memoryState = cloneAdminSystemState({
              ...memoryState,
              publishedNotices: incoming.publishedNotices,
              staff: incoming.staff,
            });
          }
          notifyListeners();
        }
      } catch {
        // ignore parse errors from concurrent writes
      }
    }
  });
}

export function getComplaintEntries(): ComplaintEntry[] {
  return loadAdminSystemState().complaintEntries;
}

export function submitComplaint(input: {
  name: string;
  email: string;
  category: ComplaintEntry["category"];
  message: string;
  profileId?: string;
  fileAttachment?: ComplaintEntry["fileAttachment"];
}) {
  const entry: ComplaintEntry = {
    id: `cpl-${Date.now()}`,
    profileId: input.profileId,
    name: input.name.trim(),
    email: input.email.trim(),
    category: input.category,
    message: input.message.trim(),
    date: "Upravo sada",
    submittedAt: new Date().toISOString(),
    status: "novo",
    fileAttachment: input.fileAttachment,
  };

  return mutateState((state) => ({
    ...state,
    complaintEntries: [entry, ...state.complaintEntries],
  }));
}

export function updateComplaintStatus(id: string, status: ComplaintStatus) {
  return mutateState((state) => ({
    ...state,
    complaintEntries: state.complaintEntries.map((entry) =>
      entry.id === id ? { ...entry, status } : entry,
    ),
  }));
}

export function deleteComplaintEntry(id: string) {
  return mutateState((state) => ({
    ...state,
    complaintEntries: state.complaintEntries.filter((entry) => entry.id !== id),
  }));
}

export function replyToComplaint(id: string, reply: string) {
  return mutateState((state) => ({
    ...state,
    complaintEntries: state.complaintEntries.map((entry) =>
      entry.id === id
        ? { ...entry, adminReply: reply.trim(), adminRepliedAt: new Date().toISOString(), status: "reseno" as const }
        : entry,
    ),
  }));
}

export function getStudentComplaints(profileId?: string, email?: string) {
  const entries = getComplaintEntries();
  if (profileId) return entries.filter((e) => e.profileId === profileId);
  if (email) return entries.filter((e) => e.email.toLowerCase() === email.toLowerCase());
  return [];
}

export type AdminSyncFailureKind = "timeout" | "network" | null;

export function getAdminSyncStatus() {
  const hasCachedState = Boolean(
    remoteState ||
      (memoryState &&
        storageHydrated &&
        typeof window !== "undefined" &&
        localStorage.getItem(ADMIN_SYSTEM_STORAGE_KEY)),
  );

  return {
    syncFailed,
    isSyncing,
    hasCachedState,
    hasSuccessfulRemoteSync,
    lastSyncError,
  };
}

const CLIENT_SYNC_TTL_MS = 60_000;

function readAdminSystemFromStorage(): AdminSystemState {
  const initial = createInitialAdminSystemState();

  try {
    const raw = localStorage.getItem(ADMIN_SYSTEM_STORAGE_KEY);
    if (!raw) {
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<StoredAdminSystem>;
    if (parsed.demoVersion !== ADMIN_SYSTEM_DEMO_VERSION) {
      return initial;
    }

    return {
      workingHours: parsed.workingHours ?? initial.workingHours,
      reservationAdvanceDays: parsed.reservationAdvanceDays ?? initial.reservationAdvanceDays,
      bookingCutoffHours: parsed.bookingCutoffHours ?? initial.bookingCutoffHours,
      cancellationCutoffHours: parsed.cancellationCutoffHours ?? initial.cancellationCutoffHours,
      reservationEnabled: parsed.reservationEnabled ?? initial.reservationEnabled,
      closedDates: parsed.closedDates ?? initial.closedDates,
      mealPrices: parsed.mealPrices ?? initial.mealPrices,
      zetonDepositRsd: parsed.zetonDepositRsd ?? initial.zetonDepositRsd,
      publishedNotices: parsed.publishedNotices ?? initial.publishedNotices,
      staff: parsed.staff ?? initial.staff,
      feedbackEntries: parsed.feedbackEntries ?? initial.feedbackEntries,
      complaintEntries: parsed.complaintEntries ?? initial.complaintEntries,
      analyticsSeed: parsed.analyticsSeed ?? initial.analyticsSeed,
    };
  } catch {
    return initial;
  }
}

/** Učitaj localStorage posle hydracije — sprečava SSR/client mismatch. */
export function hydrateAdminSystemFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  const raw = localStorage.getItem(ADMIN_SYSTEM_STORAGE_KEY);
  if (!raw) {
    const initial = createInitialAdminSystemState();
    memoryState = cloneAdminSystemState(initial);
    localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify(withDemoVersion(initial)));
  } else {
    const parsed = JSON.parse(raw) as Partial<StoredAdminSystem>;
    if (parsed.demoVersion !== ADMIN_SYSTEM_DEMO_VERSION) {
      const fresh = createInitialAdminSystemState();
      memoryState = cloneAdminSystemState(fresh);
      localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify(withDemoVersion(fresh)));
    } else {
      memoryState = cloneAdminSystemState(readAdminSystemFromStorage());
    }
  }

  storageHydrated = true;
  notifyListeners();
}

export async function syncAdminSystemFromApi(options?: {
  scope?: AdminApiScope;
  force?: boolean;
}) {
  if (!shouldUseAdminApi()) {
    return;
  }

  const scope = options?.scope ?? "public";
  const now = Date.now();
  if (
    !options?.force &&
    remoteState &&
    lastSyncScope === scope &&
    now - lastSyncAt < CLIENT_SYNC_TTL_MS
  ) {
    return;
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    isSyncing = true;
    notifyListeners();

    try {
      remoteState = await fetchAdminFromApi(scope);
      lastSyncAt = Date.now();
      lastSyncScope = scope;
      syncFailed = false;
      lastSyncError = null;
      hasSuccessfulRemoteSync = true;

      // Always merge remote data into memoryState so field-level changes
      // (e.g. lastLoginAt) reach the admin UI.
      if (memoryState && remoteState) {
        // Preserve local lastLogoutAt for any staff member where the remote
        // doesn't have one (e.g. server write failed but local update succeeded).
        const mergedStaff = remoteState.staff.map((remote) => {
          if (remote.lastLogoutAt) return remote;
          const local = memoryState!.staff.find(
            (s) => s.email.toLowerCase() === remote.email.toLowerCase(),
          );
          if (local?.lastLogoutAt) {
            return { ...remote, lastLogoutAt: local.lastLogoutAt };
          }
          return remote;
        });
        memoryState = cloneAdminSystemState({
          ...memoryState,
          publishedNotices: remoteState.publishedNotices,
          staff: mergedStaff,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify(withDemoVersion(memoryState)));
        }
      } else if (!memoryState) {
        memoryState = cloneAdminSystemState(remoteState);
        if (typeof window !== "undefined") {
          localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify(withDemoVersion(remoteState)));
        }
      }

      notifyListeners();
    } catch (error) {
      lastSyncError =
        error instanceof ApiError && error.status === 408 ? "timeout" : "network";
      syncFailed = true;
      notifyListeners();
    } finally {
      isSyncing = false;
      syncInFlight = null;
      notifyListeners();
    }
  })();

  return syncInFlight;
}

export function applyAdminSystemState(state: AdminSystemState) {
  remoteState = state;
  lastSyncAt = Date.now();
  syncFailed = false;
  lastSyncError = null;
  hasSuccessfulRemoteSync = true;
  memoryState = cloneAdminSystemState(state);
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify(withDemoVersion(state)));
  }
  notifyListeners();
}

function withDemoVersion(state: AdminSystemState): StoredAdminSystem {
  return { ...state, demoVersion: ADMIN_SYSTEM_DEMO_VERSION };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function persistState(state: AdminSystemState) {
  memoryState = cloneAdminSystemState(state);
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify(withDemoVersion(state)));
  }
  notifyListeners();
}

export function loadAdminSystemState(): AdminSystemState {
  if (memoryState) {
    return cloneAdminSystemState(memoryState);
  }

  if (remoteState) {
    return cloneAdminSystemState(remoteState);
  }

  return createInitialAdminSystemState();
}

export function subscribeAdminSystem(listener: AdminSystemListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function mutateState(mutator: (state: AdminSystemState) => AdminSystemState) {
  const current = loadAdminSystemState();
  const next = mutator(current);
  persistState(next);
  return next;
}

export function getWorkingHours(): WorkingHoursRow[] {
  return loadAdminSystemState().workingHours;
}

export function getReservationAdvanceDays(): number {
  return loadAdminSystemState().reservationAdvanceDays;
}

export function getBookingCutoffHours(): number {
  return loadAdminSystemState().bookingCutoffHours;
}

export function getCancellationCutoffHours(): number {
  return loadAdminSystemState().cancellationCutoffHours;
}

export function isReservationEnabled(): boolean {
  return loadAdminSystemState().reservationEnabled;
}

export function isDateClosedForReservation(dateKey: string): boolean {
  return loadAdminSystemState().closedDates.some(
    (entry) =>
      entry.blocksReservation &&
      (entry.dateKey === dateKey ||
        (entry.dateKeyEnd != null && dateKey >= entry.dateKey && dateKey <= entry.dateKeyEnd)),
  );
}

export function getClosedDateEntryForDate(dateKey: string): ClosedDateEntry | undefined {
  return loadAdminSystemState().closedDates.find(
    (entry) =>
      entry.dateKey === dateKey ||
      (entry.dateKeyEnd != null && dateKey >= entry.dateKey && dateKey <= entry.dateKeyEnd),
  );
}

export function getClosedDates(): ClosedDateEntry[] {
  return loadAdminSystemState().closedDates;
}

export function getMealPrices(): MealPriceConfig {
  return loadAdminSystemState().mealPrices;
}

export function getZetonDepositRsd(): number {
  return loadAdminSystemState().zetonDepositRsd;
}

export function getActivePublishedNotices(): PublishedNotice[] {
  return loadAdminSystemState().publishedNotices.filter((notice) => !notice.archived);
}

function targetsInclude(
  target: NoticeTarget[] | string,
  value: NoticeTarget,
): boolean {
  if (Array.isArray(target)) {
    return target.includes(value);
  }
  return target === value || target === "both";
}

export function getPublishedStudentNotices(): NotificationItem[] {
  return getActivePublishedNotices()
    .filter((notice) => targetsInclude(notice.target, "student"))
    .map((notice) => ({
      id: notice.id,
      title: notice.title,
      message: notice.message,
      time: notice.time,
      priority: notice.priority,
      category: "administration" as const,
      read: false,
      displayMode: notice.displayMode,
      actionHref: notice.actionHref,
      actionLabel: notice.actionLabel,
      sortAt: new Date(notice.publishedAt).getTime(),
    }));
}

export function getPublishedReferentNotices(userEmail?: string): ReferentAdminNotice[] {
  return getActivePublishedNotices()
    .filter((notice) => {
      if (!targetsInclude(notice.target, "referent")) return false;
      if (notice.targetEmail && notice.targetEmail !== userEmail) return false;
      return true;
    })
    .map((notice) => ({
      id: notice.id,
      title: notice.title,
      message: notice.message,
      time: notice.time,
      priority: notice.priority,
      isInternal: !!notice.targetEmail,
      displayMode: notice.displayMode,
    }));
}

export function getPublishedKitchenNotices(userEmail?: string): ReferentAdminNotice[] {
  return getActivePublishedNotices()
    .filter((notice) => {
      if (!targetsInclude(notice.target, "kitchen")) return false;
      if (notice.targetEmail && notice.targetEmail !== userEmail) return false;
      return true;
    })
    .map((notice) => ({
      id: notice.id,
      title: notice.title,
      message: notice.message,
      time: notice.time,
      priority: notice.priority,
      isInternal: !!notice.targetEmail,
      displayMode: notice.displayMode,
    }));
}

export function countKitchenNotices(): number {
  return getPublishedKitchenNotices().length;
}

export function getFeedbackEntries(): FeedbackEntry[] {
  return loadAdminSystemState().feedbackEntries;
}

export function getStaffMembers(): StaffMember[] {
  return loadAdminSystemState().staff;
}

export function getStaffMembersFromStorage(): StaffMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADMIN_SYSTEM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredAdminSystem>;
    if (parsed.demoVersion !== ADMIN_SYSTEM_DEMO_VERSION) return [];
    return parsed.staff ?? [];
  } catch {
    return [];
  }
}

export function getAnalyticsSeed() {
  return loadAdminSystemState().analyticsSeed;
}

export function getReservationAdvanceDaysLabel(): string {
  const days = getReservationAdvanceDays();
  const ahead = days - 1;
  if (ahead <= 0) {
    return "samo za danas";
  }
  if (ahead === 1) {
    return "danas i naredni 1 dan unapred";
  }
  return `danas i naredna ${ahead} dana unapred`;
}

export function updateWorkingHours(workingHours: WorkingHoursRow[]) {
  const cloned = structuredClone(workingHours);
  const next = mutateState((state) => ({ ...state, workingHours: cloned }));

  if (remoteState) {
    remoteState = { ...remoteState, workingHours: cloned };
    notifyListeners();
  }

  if (shouldUseAdminApi()) {
    void patchAdminFromApi({ workingHours: cloned }).catch(() => {});
  }

  recordAdminAudit({
    kind: "working_hours",
    actionType: "working_hours.update",
    message: "Promenjeno radno vreme menze",
  });

  return next;
}

export function setReservationRules(input: {
  reservationAdvanceDays: number;
  bookingCutoffHours: number;
  cancellationCutoffHours: number;
  reservationEnabled: boolean;
}) {
  const clampedDays = Math.max(1, Math.min(14, input.reservationAdvanceDays));
  const clampedBookingCutoff = Math.max(1, Math.min(168, Math.round(input.bookingCutoffHours)));
  const clampedCancellationCutoff = Math.max(1, Math.min(168, Math.round(input.cancellationCutoffHours)));
  const next = mutateState((state) => ({
    ...state,
    reservationAdvanceDays: clampedDays,
    bookingCutoffHours: clampedBookingCutoff,
    cancellationCutoffHours: clampedCancellationCutoff,
    reservationEnabled: input.reservationEnabled,
  }));

  if (remoteState) {
    remoteState = {
      ...remoteState,
      reservationAdvanceDays: clampedDays,
      bookingCutoffHours: clampedBookingCutoff,
      cancellationCutoffHours: clampedCancellationCutoff,
      reservationEnabled: input.reservationEnabled,
    };
    notifyListeners();
  }

  if (shouldUseAdminApi()) {
    void patchAdminFromApi({
      reservationAdvanceDays: clampedDays,
      bookingCutoffHours: clampedBookingCutoff,
      cancellationCutoffHours: clampedCancellationCutoff,
      reservationEnabled: input.reservationEnabled,
    }).catch(() => {});
  }

  recordAdminAudit({
    kind: "reservation",
    actionType: "reservation.rules",
    message: `Izmenjena pravila rezervacija (unapred: ${clampedDays}d, ${input.reservationEnabled ? "omogućeno" : "onemogućeno"})`,
  });

  return next;
}

export function addClosedDate(entry: Omit<ClosedDateEntry, "id">) {
  const newEntry = { ...entry, id: `closed-${Date.now()}` };
  const next = mutateState((state) => ({
    ...state,
    closedDates: [newEntry, ...state.closedDates.filter((item) => item.dateKey !== entry.dateKey)],
  }));

  if (remoteState) {
    remoteState = { ...remoteState, closedDates: next.closedDates };
    notifyListeners();
  }

  if (shouldUseAdminApi()) {
    void patchAdminFromApi({ closedDates: next.closedDates }).catch(() => {});
  }

  recordAdminAudit({
    kind: "reservation",
    actionType: "reservation.closed_date_add",
    message: `Dodat datum zatvaranja menze: ${newEntry.dateKey}`,
  });

  return next;
}

export function removeClosedDate(id: string) {
  const before = loadAdminSystemState().closedDates.find((entry) => entry.id === id);
  const next = mutateState((state) => ({
    ...state,
    closedDates: state.closedDates.filter((entry) => entry.id !== id),
  }));

  if (remoteState) {
    remoteState = { ...remoteState, closedDates: next.closedDates };
    notifyListeners();
  }

  if (shouldUseAdminApi()) {
    void patchAdminFromApi({ closedDates: next.closedDates }).catch(() => {});
  }

  recordAdminAudit({
    kind: "reservation",
    actionType: "reservation.closed_date_remove",
    message: `Uklonjen datum zatvaranja menze: ${before?.dateKey ?? id}`,
  });

  return next;
}

export function updateMealPrices(mealPrices: MealPriceConfig) {
  const next = mutateState((state) => ({
    ...state,
    mealPrices: structuredClone(mealPrices),
  }));

  recordAdminAudit({
    kind: "prices",
    actionType: "prices.update",
    message: "Izmenjene cene obroka i komponenti",
  });

  return next;
}

export function setZetonDepositRsd(zetonDepositRsd: number) {
  const amount = Math.max(0, zetonDepositRsd);
  const next = mutateState((state) => ({ ...state, zetonDepositRsd: amount }));

  if (remoteState) {
    remoteState = { ...remoteState, zetonDepositRsd: amount };
    notifyListeners();
  }

  if (shouldUseAdminApi()) {
    void patchAdminFromApi({ zetonDepositRsd: amount }).catch(() => {});
  }

  recordAdminAudit({
    kind: "prices",
    actionType: "prices.zeton_deposit",
    message: `Izmenjen depozit za žetone: ${amount.toLocaleString("sr-RS")} RSD`,
  });

  return next;
}

export const DEFAULT_NOTICE_DISPLAY_MODE: PublishedNotice["displayMode"] = "standard";

export async function publishNotice(input: {
  title: string;
  message: string;
  priority: PublishedNotice["priority"];
  targets: NoticeTarget[];
  targetEmail?: string;
  displayMode?: PublishedNotice["displayMode"];
  actionHref?: string;
  actionLabel?: string;
  authorName?: string;
  authorEmail?: string;
}) {
  if (shouldUseAdminApi()) {
    try {
      await publishNoticeToApi({
        title: input.title,
        message: input.message,
        priority: input.priority,
        targets: input.targets,
        targetEmail: input.targetEmail,
        displayMode: input.displayMode ?? DEFAULT_NOTICE_DISPLAY_MODE,
      });
    } catch {
      throw new Error("Failed to publish notice via API");
    }
  }

  const now = new Date();
  const notice: PublishedNotice = {
    id: `notice-${Date.now()}`,
    title: input.title.trim(),
    message: input.message.trim(),
    time: new Intl.DateTimeFormat("sr-RS", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
    priority: input.priority,
    target: input.targets,
    targetEmail: input.targetEmail,
    publishedAt: now.toISOString(),
    archived: false,
    displayMode: input.displayMode ?? DEFAULT_NOTICE_DISPLAY_MODE,
    actionHref: input.actionHref,
    actionLabel: input.actionLabel,
    authorName: input.authorName,
    authorEmail: input.authorEmail,
  };

  recordAdminAudit({
    kind: "notice",
    actionType: "notice.publish",
    message: `Objavljeno obaveštenje: „${notice.title}”`,
  });

  return mutateState((state) => ({
    ...state,
    publishedNotices: [notice, ...state.publishedNotices],
  }));
}

export async function archiveNotice(idOrIds: string | string[]) {
  const ids = typeof idOrIds === "string" ? [idOrIds] : idOrIds;
  const idSet = new Set(ids);

  if (shouldUseAdminApi()) {
    try {
      await archiveNoticeFromApi(ids);
    } catch {
      throw new Error("Failed to archive notices via API");
    }
  }

  recordAdminAudit({
    kind: "notice",
    actionType: "notice.archive",
    message: `Arhivirano obaveštenje${ids.length > 1 ? ` (${ids.length})` : ""}`,
  });

  return mutateState((state) => ({
    ...state,
    publishedNotices: state.publishedNotices.map((notice) =>
      idSet.has(notice.id) ? { ...notice, archived: true } : notice,
    ),
  }));
}

export function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function getStaffMemberByEmail(email: string): StaffMember | undefined {
  return loadAdminSystemState().staff.find(
    (m) => m.email.toLowerCase() === email.trim().toLowerCase(),
  );
}

export function updateStaffMemberPassword(
  email: string,
  newPassword: string,
): boolean {
  const state = loadAdminSystemState();
  const idx = state.staff.findIndex(
    (m) => m.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (idx === -1) return false;

  const updated = {
    ...state.staff[idx],
    demoPassword: newPassword,
    mustChangePassword: true,
  };

  mutateState((_state) => ({
    ..._state,
    staff: _state.staff.map((m) => (m.email.toLowerCase() === email.trim().toLowerCase() ? updated : m)),
  }));

  if (isKitchenEmployeeRole(state.staff[idx].role)) {
    updateKitchenEmployeePassword(email, newPassword);
  }

  if (shouldUseAdminApi()) {
    const currentStaff = getStaffMembers();
    void upsertStaffListToApi(currentStaff).catch(() => {});
  }

  return true;
}

export async function addStaffMember(input: {
  name: string;
  email: string;
  role: EmployeeRole;
  password?: string;
  supabaseUserId?: string;
}) {
  let supabaseUserId = input.supabaseUserId;
  const demoPassword = input.password ?? generatePassword();

  if (shouldUseAdminApi() && !supabaseUserId) {
    try {
      const appRole: string =
        input.role === "admin" ? "admin" : input.role === "referent" ? "referent" : "kitchen";
      const kitchenRole = isKitchenEmployeeRole(input.role)
        ? (mapEmployeeRoleToKitchenRole(input.role) ?? "none")
        : undefined;
      const result = await inviteStaffToApi({
        email: input.email.trim().toLowerCase(),
        displayName: input.name.trim(),
        role: appRole,
        password: demoPassword,
        kitchenRole,
      });
      supabaseUserId = result.supabaseUserId;
    } catch (err) {
      console.error("[addStaffMember] API invite failed, falling back to localStorage:", err);
    }
  }

  const mustChangePassword = true;

  const member: StaffMember = {
    id: `staff-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    active: true,
    createdAt: new Date().toISOString(),
    demoPassword,
    mustChangePassword,
    supabaseUserId,
  };

  mutateState((state) => ({
    ...state,
    staff: [member, ...state.staff],
  }));

  if (isKitchenEmployeeRole(input.role)) {
    const kitchenRole = mapEmployeeRoleToKitchenRole(input.role);
    if (kitchenRole) {
      createKitchenEmployee({
        email: member.email,
        displayName: member.name,
        role: kitchenRole,
        password: demoPassword,
        mustChangePassword,
      });
    }
  }

  // Persist updated staff list to server so API sync doesn't overwrite it
  if (shouldUseAdminApi()) {
    const currentStaff = getStaffMembers();
    void upsertStaffListToApi(currentStaff).catch(() => {});
  }

  recordAdminAudit({
    kind: "staff",
    actionType: "staff.create",
    message: `Kreiran nalog zaposlenog: ${member.name} (${member.email}, ${member.role})`,
  });

  return member;
}

export function updateStaffMember(id: string, patch: Partial<Pick<StaffMember, "name" | "email" | "role" | "active" | "suspendedReason" | "lastLoginAt" | "lastLogoutAt">>) {
  const before = loadAdminSystemState().staff.find((member) => member.id === id);
  const result = mutateState((state) => ({
    ...state,
    staff: state.staff.map((member) =>
      member.id === id ? { ...member, ...patch } : member,
    ),
  }));

  if (shouldUseAdminApi()) {
    const currentStaff = getStaffMembers();
    void upsertStaffListToApi(currentStaff).catch(() => {});
  }

  if (before && patch.role !== undefined && patch.role !== before.role) {
    recordAdminAudit({
      kind: "staff",
      actionType: "staff.role_change",
      message: `Izmenjena uloga zaposlenog: ${before.name} (${before.role} → ${patch.role})`,
    });
  } else if (before && patch.active === true && before.active === false) {
    recordAdminAudit({
      kind: "staff",
      actionType: "staff.reactivate",
      message: `Aktiviran nalog zaposlenog: ${before.name}`,
    });
  } else if (before && patch.active === false && before.active !== false) {
    recordAdminAudit({
      kind: "staff",
      actionType: "staff.suspend",
      message: `Suspendovan nalog zaposlenog: ${before.name}`,
    });
  }

  return result;
}

function ensureAdminHydrated() {
  const state = loadAdminSystemState();
  if (state.staff.length === 0) {
    // Don't rely solely on hydrateAdminSystemFromStorage's storageHydrated guard —
    // the admin tab may have written staff data to localStorage before the `storage`
    // event fired in this tab. Re-read directly.
    if (typeof window !== "undefined") {
      const stored = readAdminSystemFromStorage();
      if (stored.staff.length > 0) {
        memoryState = cloneAdminSystemState(stored);
      } else {
        hydrateAdminSystemFromStorage();
      }
    } else {
      hydrateAdminSystemFromStorage();
    }
  }
  return loadAdminSystemState();
}

export function setStaffLastLoginAt(email: string, value: string) {
  const state = ensureAdminHydrated();
  const member = state.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (member) {
    updateStaffMember(member.id, { lastLoginAt: value });
    return;
  }

  // Fallback: staff member not in memoryState — write directly to localStorage
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(ADMIN_SYSTEM_STORAGE_KEY);
    if (raw) {
      try {
        const existing = JSON.parse(raw) as StoredAdminSystem;
        if (existing.staff) {
          const updated = existing.staff.map((s) =>
            s.email.toLowerCase() === email.toLowerCase()
              ? { ...s, lastLoginAt: value }
              : s,
          );
          if (updated.length === existing.staff.length && !existing.staff.find((s) => s.email.toLowerCase() === email.toLowerCase())) {
            updated.push({
              id: `staff-auto-${Date.now()}`,
              name: email.split("@")[0],
              email: email.toLowerCase(),
              role: "referent",
              active: true,
              createdAt: new Date().toISOString(),
              lastLoginAt: value,
              lastLogoutAt: null,
            } as StaffMember);
          }
          localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify({ ...existing, staff: updated, demoVersion: ADMIN_SYSTEM_DEMO_VERSION }));
          if (memoryState) {
            memoryState = cloneAdminSystemState({ ...memoryState, staff: updated });
            notifyListeners();
          }
        }
      } catch {
        // Ignore
      }
    }
  }
}

export function setStaffLastLogoutAt(email: string) {
  // Write directly to localStorage + memoryState.
  // First try to find the staff member in memoryState via ensureAdminHydrated.
  const state = ensureAdminHydrated();
  const found = state.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (found) {
    const staff = state.staff.map((s) =>
      s.email.toLowerCase() === email.toLowerCase() ? { ...s, lastLogoutAt: new Date().toISOString() } : s,
    );
    persistState({ ...state, staff });
    return;
  }

  // Staff member not found in memoryState or localStorage.
  // If backend is enabled, the server-side DELETE handler already saved lastLogoutAt,
  // so the next admin sync will pick it up. Write a minimal entry to localStorage
  // so the admin tab sees the update immediately via the storage event.
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(ADMIN_SYSTEM_STORAGE_KEY);
    if (raw) {
      try {
        const existing = JSON.parse(raw) as StoredAdminSystem;
        if (existing.staff) {
          const updated = existing.staff.map((s) =>
            s.email.toLowerCase() === email.toLowerCase()
              ? { ...s, lastLogoutAt: new Date().toISOString() }
              : s,
          );
          if (updated.length !== existing.staff.length) {
            // Email still not found — add a minimal entry
            updated.push({
              id: `staff-auto-${Date.now()}`,
              name: email.split("@")[0],
              email: email.toLowerCase(),
              role: "kuvar",
              active: true,
              createdAt: new Date().toISOString(),
              lastLoginAt: null,
              lastLogoutAt: new Date().toISOString(),
            } as StaffMember);
          }
          localStorage.setItem(ADMIN_SYSTEM_STORAGE_KEY, JSON.stringify({ ...existing, staff: updated, demoVersion: ADMIN_SYSTEM_DEMO_VERSION }));
          // Also update memoryState
          if (memoryState) {
            memoryState = cloneAdminSystemState({
              ...memoryState,
              staff: updated,
            });
            notifyListeners();
          }
        }
      } catch {
        // Ignore parse errors — server sync will fix it
      }
    }
  }
}

export function deactivateStaffMember(id: string) {
  return updateStaffMember(id, { active: false });
}

export async function deleteStaffMember(id: string) {
  const member = getStaffMembers().find((m) => m.id === id);
  if (shouldUseAdminApi() && member?.supabaseUserId) {
    try {
      await deleteStaffFromApi(member.supabaseUserId);
    } catch (err) {
      console.error("[deleteStaffMember] API error:", err);
    }
  }
  mutateState((state) => ({
    ...state,
    staff: state.staff.filter((m) => m.id !== id),
  }));
  if (member) {
    if (isKitchenEmployeeRole(member.role)) {
      deleteKitchenEmployee(member.email);
    }
  }

  if (shouldUseAdminApi()) {
    const currentStaff = getStaffMembers();
    void upsertStaffListToApi(currentStaff).catch(() => {});
  }

  recordAdminAudit({
    kind: "staff",
    actionType: "staff.delete",
    message: `Obrisan nalog zaposlenog: ${member?.name ?? id}${member ? ` (${member.email})` : ""}`,
  });
}

export function submitFeedback(input: {
  name: string;
  message: string;
  rating: number;
  anonymous?: boolean;
  profileId?: string;
}) {
  const entry: FeedbackEntry = {
    id: `fb-${Date.now()}`,
    profileId: input.profileId,
    name: input.anonymous ? "Anonimni korisnik" : input.name.trim(),
    initials: input.anonymous ? undefined : input.name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    message: input.message.trim(),
    rating: input.rating,
    helpfulCount: 0,
    disagreeCount: 0,
    anonymous: input.anonymous,
    date: "Upravo sada",
    submittedAt: new Date().toISOString(),
    reviewed: false,
  };

  return mutateState((state) => ({
    ...state,
    feedbackEntries: [entry, ...state.feedbackEntries],
  }));
}

export function toggleFeedbackHelpful(id: string, add: boolean) {
  return mutateState((state) => ({
    ...state,
    feedbackEntries: state.feedbackEntries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            helpfulCount: Math.max(0, entry.helpfulCount + (add ? 1 : -1)),
          }
        : entry,
    ),
  }));
}

export async function deleteFeedbackEntry(id: string) {
  if (shouldUseAdminApi()) {
    try {
      await deleteFeedbackEntryFromApi(id);
    } catch {
      // continue with local delete
    }
  }
  return mutateState((state) => ({
    ...state,
    feedbackEntries: state.feedbackEntries.filter((entry) => entry.id !== id),
  }));
}

export async function markFeedbackReviewed(id: string, adminReply?: string) {
  if (shouldUseAdminApi()) {
    try {
      await markFeedbackReviewedFromApi(id, adminReply);
    } catch {
      // continue with local update
    }
  }
  return mutateState((state) => ({
    ...state,
    feedbackEntries: state.feedbackEntries.map((entry) =>
      entry.id === id
        ? { ...entry, reviewed: true, adminReply: adminReply?.trim() || entry.adminReply }
        : entry,
    ),
  }));
}

export async function clearFeedbackReply(id: string) {
  if (shouldUseAdminApi()) {
    try {
      await clearFeedbackReplyFromApi(id);
    } catch {
      // continue with local update
    }
  }
  return mutateState((state) => ({
    ...state,
    feedbackEntries: state.feedbackEntries.map((entry) =>
      entry.id === id ? { ...entry, adminReply: undefined, reviewed: false } : entry,
    ),
  }));
}

export function toggleFeedbackDisagree(id: string, add: boolean) {
  return mutateState((state) => ({
    ...state,
    feedbackEntries: state.feedbackEntries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            disagreeCount: Math.max(0, entry.disagreeCount + (add ? 1 : -1)),
          }
        : entry,
    ),
  }));
}
