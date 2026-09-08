import { findProfileByClerkUserId } from "@/server/repositories/auth";
import type { profiles } from "@/server/db/schema";

type ProfileRow = typeof profiles.$inferSelect;

const CACHE_TTL_MS = 60_000;

const profileCache = new Map<string, { profile: ProfileRow | null; expiresAt: number }>();

export async function getCachedProfileByClerkUserId(clerkUserId: string) {
  const cached = profileCache.get(clerkUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  try {
    const profile = await findProfileByClerkUserId(clerkUserId);
    profileCache.set(clerkUserId, {
      profile,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return profile;
  } catch (error) {
    console.error("[clerk-profile-cache] lookup failed", error);
    if (cached) {
      return cached.profile;
    }
    return null;
  }
}

export function invalidateClerkProfileCache(clerkUserId?: string) {
  if (clerkUserId) {
    profileCache.delete(clerkUserId);
    return;
  }

  profileCache.clear();
}
