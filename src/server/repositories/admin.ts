import { count, eq, inArray, sql } from "drizzle-orm";
import type { AdminSystemState, EmployeeRole, PublishedNotice, StaffMember } from "@/lib/admin-system-mock";
import { createInitialAdminSystemState } from "@/lib/admin-system-mock";
import { formatFeedbackDate } from "@/lib/knjiga-utisaka-mock";
import { getDb } from "@/server/db";
import {
  analyticsEvents,
  appConfig,
  feedbackEntries,
  noticeReads,
  profiles,
} from "@/server/db/schema";

const CONFIG_KEY = "admin_system";
const CACHE_TTL_MS = 60_000;

type AdminCacheEntry = {
  state: AdminSystemState;
  expiresAt: number;
};

const cache = {
  public: null as AdminCacheEntry | null,
  full: null as AdminCacheEntry | null,
};

export function invalidateAdminSystemCache() {
  cache.public = null;
  cache.full = null;
}

function mapNotices(notices: PublishedNotice[]) {
  return notices;
}

function mapFeedback(feedback: (typeof feedbackEntries.$inferSelect)[]) {
  return feedback.map((entry) => ({
    id: entry.id,
    profileId: entry.profileId ?? undefined,
    initials: entry.anonymous ? undefined : entry.initials ?? undefined,
    name: entry.anonymous ? "Anonimni korisnik" : entry.name,
    date: formatFeedbackDate(entry.submittedAt.toISOString()),
    message: entry.message,
    rating: entry.rating,
    helpfulCount: entry.helpfulCount,
    disagreeCount: entry.disagreeCount,
    anonymous: entry.anonymous,
    submittedAt: entry.submittedAt.toISOString(),
    reviewed: entry.reviewed,
    adminReply: entry.adminReply ?? undefined,
  }));
}

function mapAnalyticsEvents(events: (typeof analyticsEvents.$inferSelect)[]) {
  return events.map((event) => ({
    id: event.id,
    at: event.createdAt.toISOString(),
    type: event.type as AdminSystemState["analyticsSeed"][number]["type"],
    amountRsd: event.amountRsd ? Number(event.amountRsd) : undefined,
    mealType: event.mealType ?? undefined,
    cardId: event.cardId ?? undefined,
  }));
}

async function loadStaffFromProfiles(): Promise<StaffMember[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(profiles)
    .where(inArray(profiles.role, ["admin", "referent", "kitchen"]));
  return rows.map((p) => ({
    id: p.id,
    name: p.displayName,
    email: p.email,
    role: (p.role === "kitchen" ? (p.kitchenRole ?? "kuvar") : p.role) as EmployeeRole,
    active: true,
    createdAt: p.createdAt.toISOString(),
    supabaseUserId: p.id,
  }));
}

async function loadAdminConfigBase() {
  const db = getDb();
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, CONFIG_KEY)).limit(1);
  const configState = (row?.value as AdminSystemState | undefined) ?? createInitialAdminSystemState();

  // Merge staff from profiles table (source of truth) with app_config extras
  const profileStaff = await loadStaffFromProfiles();
  if (profileStaff.length === 0) {
    return configState;
  }

  const profileMap = new Map(profileStaff.map((s) => [s.email.toLowerCase(), s]));
  const configMap = new Map(configState.staff.map((s) => [s.email.toLowerCase(), s]));

  // Profiles override config; keep config-only entries that aren't in profiles
  const merged: StaffMember[] = [];
  const seen = new Set<string>();

  for (const ps of profileStaff) {
    const email = ps.email.toLowerCase();
    seen.add(email);
    const cs = configMap.get(email);
    merged.push({
      ...cs,
      ...ps,
      // Keep config extras that profiles doesn't have
      demoPassword: cs?.demoPassword,
      mustChangePassword: cs?.mustChangePassword,
      active: cs?.active ?? true,
    });
  }

  for (const cs of configState.staff) {
    const email = cs.email.toLowerCase();
    if (!seen.has(email)) {
      seen.add(email);
      merged.push(cs);
    }
  }

  return { ...configState, staff: merged };
}

async function loadPublicAdminSystemFromDb(): Promise<AdminSystemState> {
  const db = getDb();
  const [base, feedback] = await Promise.all([
    loadAdminConfigBase(),
    db.select().from(feedbackEntries).orderBy(feedbackEntries.submittedAt),
  ]);

  return {
    ...base,
    publishedNotices: mapNotices(base.publishedNotices),
    feedbackEntries: mapFeedback(feedback),
    analyticsSeed: [],
  };
}

async function loadFullAdminSystemFromDb(): Promise<AdminSystemState> {
  const db = getDb();
  const [base, feedback, events] = await Promise.all([
    loadAdminConfigBase(),
    db.select().from(feedbackEntries).orderBy(feedbackEntries.submittedAt),
    db.select().from(analyticsEvents).orderBy(analyticsEvents.createdAt),
  ]);

  return {
    ...base,
    publishedNotices: mapNotices(base.publishedNotices),
    feedbackEntries: mapFeedback(feedback),
    analyticsSeed: mapAnalyticsEvents(events),
  };
}

function readCached(scope: "public" | "full") {
  const entry = cache[scope];
  if (entry && entry.expiresAt > Date.now()) {
    return entry.state;
  }
  return null;
}

function writeCached(scope: "public" | "full", state: AdminSystemState) {
  cache[scope] = {
    state,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export async function fetchPublicAdminSystemState(): Promise<AdminSystemState> {
  const cached = readCached("public");
  if (cached) {
    return cached;
  }

  const state = await loadPublicAdminSystemFromDb();
  writeCached("public", state);
  return state;
}

export async function fetchAdminSystemState(): Promise<AdminSystemState> {
  const cached = readCached("full");
  if (cached) {
    return cached;
  }

  const state = await loadFullAdminSystemFromDb();
  writeCached("full", state);
  writeCached("public", {
    ...state,
    analyticsSeed: [],
  });
  return state;
}

export async function saveAdminConfigPartial(partial: Partial<AdminSystemState>) {
  invalidateAdminSystemCache();
  const db = getDb();
  const current = await loadFullAdminSystemFromDb();
  const next = { ...current, ...partial };

  await db
    .insert(appConfig)
    .values({ key: CONFIG_KEY, value: next })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: next, updatedAt: new Date() },
    });

  invalidateAdminSystemCache();
  return next;
}

export async function archiveNoticesDb(ids: string[]) {
  const idSet = new Set(ids);
  const current = await loadAdminConfigBase();
  const next: AdminSystemState = {
    ...current,
    publishedNotices: current.publishedNotices.map((notice) =>
      idSet.has(notice.id) ? { ...notice, archived: true } : notice,
    ),
  };

  const db = getDb();
  await db
    .insert(appConfig)
    .values({ key: CONFIG_KEY, value: next })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: next, updatedAt: new Date() },
    });

  invalidateAdminSystemCache();
}

export async function publishNoticeDb(notice: AdminSystemState["publishedNotices"][number]) {
  const current = await loadAdminConfigBase();
  const next: AdminSystemState = {
    ...current,
    publishedNotices: [notice, ...current.publishedNotices],
  };

  const db = getDb();
  await db
    .insert(appConfig)
    .values({ key: CONFIG_KEY, value: next })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: next, updatedAt: new Date() },
    });

  invalidateAdminSystemCache();
}

export async function submitFeedbackDb(entry: {
  profileId?: string;
  name: string;
  message: string;
  rating: number;
  anonymous?: boolean;
  initials?: string;
}) {
  const db = getDb();
  const isAnonymous = entry.anonymous ?? false;
  const [created] = await db
    .insert(feedbackEntries)
    .values({
      profileId: entry.profileId ?? null,
      name: isAnonymous ? "Anonimni korisnik" : entry.name,
      message: entry.message,
      rating: entry.rating,
      anonymous: isAnonymous,
      initials: isAnonymous ? null : entry.initials ?? null,
      dateLabel: "Upravo sada",
      submittedAt: new Date(),
    })
    .returning();

  invalidateAdminSystemCache();
  return created;
}

export async function deleteFeedbackEntryDb(id: string) {
  const db = getDb();
  await db.delete(feedbackEntries).where(eq(feedbackEntries.id, id));
  invalidateAdminSystemCache();
}

export async function toggleFeedbackHelpfulDb(id: string, add: boolean) {
  const db = getDb();
  await db
    .update(feedbackEntries)
    .set({
      helpfulCount: add ? sql`helpful_count + 1` : sql`GREATEST(helpful_count - 1, 0)`,
    })
    .where(eq(feedbackEntries.id, id));
  invalidateAdminSystemCache();
}

export async function toggleFeedbackDisagreeDb(id: string, add: boolean) {
  const db = getDb();
  await db
    .update(feedbackEntries)
    .set({
      disagreeCount: add ? sql`disagree_count + 1` : sql`GREATEST(disagree_count - 1, 0)`,
    })
    .where(eq(feedbackEntries.id, id));
  invalidateAdminSystemCache();
}

export async function markFeedbackReviewedDb(id: string, reply?: string) {
  const db = getDb();
  await db
    .update(feedbackEntries)
    .set({ reviewed: true, adminReply: reply ?? null })
    .where(eq(feedbackEntries.id, id));
  invalidateAdminSystemCache();
}

export async function clearFeedbackReplyDb(id: string) {
  const db = getDb();
  await db
    .update(feedbackEntries)
    .set({ reviewed: false, adminReply: null })
    .where(eq(feedbackEntries.id, id));
  invalidateAdminSystemCache();
}

export async function appendAnalyticsEventDb(event: AdminSystemState["analyticsSeed"][number]) {
  const db = getDb();
  await db.insert(analyticsEvents).values({
    id: event.id as `${string}-${string}-${string}-${string}-${string}`,
    type: event.type,
    amountRsd: event.amountRsd === undefined ? null : String(event.amountRsd),
    mealType: event.mealType ?? null,
    cardId: event.cardId ?? null,
    createdAt: new Date(event.at),
  });
  invalidateAdminSystemCache();
}

export async function markNoticeReadDb(noticeId: string, profileId: string) {
  const db = getDb();
  await db
    .insert(noticeReads)
    .values({ noticeId, profileId })
    .onConflictDoNothing();
  invalidateAdminSystemCache();
}

export async function getNoticeReadCountDb(noticeId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ val: count() })
    .from(noticeReads)
    .where(eq(noticeReads.noticeId, noticeId));
  return row?.val ?? 0;
}

export async function getNoticeReadCountsDb(
  noticeIds: string[],
): Promise<Record<string, number>> {
  if (noticeIds.length === 0) return {};
  const db = getDb();
  const rows = await db
    .select({ noticeId: noticeReads.noticeId, val: count() })
    .from(noticeReads)
    .where(sql`${noticeReads.noticeId} = ANY(${noticeIds}::text[])`)
    .groupBy(noticeReads.noticeId);
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.noticeId] = row.val;
  }
  return map;
}

export async function updateStaffMemberFieldInConfig(
  email: string,
  patch: Partial<Pick<StaffMember, "lastLoginAt" | "lastLogoutAt">>,
) {
  const current = await loadFullAdminSystemFromDb();
  const next: AdminSystemState = {
    ...current,
    staff: current.staff.map((s) =>
      s.email.toLowerCase() === email.toLowerCase() ? { ...s, ...patch } : s,
    ),
  };

  const db = getDb();
  await db
    .insert(appConfig)
    .values({ key: CONFIG_KEY, value: next })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: next, updatedAt: new Date() },
    });

  invalidateAdminSystemCache();
}
