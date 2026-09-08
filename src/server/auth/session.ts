import { createClerkClient, type User as ClerkUser } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { KUHINJA_DEMO_COOKIE, parseKitchenDemoCookie } from "@/lib/kuhinja-demo-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";
import type { userRoleEnum } from "@/server/db/schema";
import { getCachedProfileByClerkUserId, invalidateClerkProfileCache } from "@/server/lib/clerk-profile-cache";
import { resolveClerkStudentProfile } from "@/server/repositories/auth";
import { resolveStudentAvatarUrl } from "@/server/lib/student-avatar";
import { isBackendEnabled, isClerkEnabled } from "@/server/env";
import { parseStudentDisplayName } from "@/lib/student-profile";

export type AppRole = (typeof userRoleEnum.enumValues)[number];

const CLERK_AUTH_TIMEOUT_MS = 3_000;

function getClerkBackendClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  return createClerkClient({ secretKey });
}

async function resolveClerkRequest(request?: Request) {
  if (request) {
    return request;
  }

  const headerStore = await headers();
  const cookieStore = await cookies();
  const cookieHeader =
    headerStore.get("cookie") ??
    cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

  if (!cookieHeader) {
    return null;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  return new Request(`${proto}://${host}/api/auth/session`, {
    headers: { cookie: cookieHeader },
  });
}

async function withAuthTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeoutId = setTimeout(() => resolve(undefined), ms);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function authenticateClerkRequest(request?: Request) {
  const clerkClient = getClerkBackendClient();
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkRequest = await resolveClerkRequest(request);

  if (!clerkClient || !publishableKey || !clerkRequest) {
    return null;
  }

  try {
    const state = await withAuthTimeout(
      clerkClient.authenticateRequest(clerkRequest, {
        publishableKey,
        secretKey: process.env.CLERK_SECRET_KEY,
      }),
      CLERK_AUTH_TIMEOUT_MS,
    );

    return state?.isSignedIn ? state : null;
  } catch (error) {
    console.error("[clerk-auth] authenticateRequest failed", error);
    return null;
  }
}

async function resolveClerkAuthUserId(request?: Request) {
  const state = await authenticateClerkRequest(request);
  return state?.toAuth()?.userId ?? null;
}

export async function isClerkRequestSignedIn(request?: Request) {
  if (!isClerkEnabled()) {
    return false;
  }

  return Boolean(await resolveClerkAuthUserId(request));
}

export async function getClerkRequestUserId(request?: Request) {
  if (!isClerkEnabled()) {
    return null;
  }

  return resolveClerkAuthUserId(request);
}

export async function revokeClerkStudentSession(request?: Request) {
  const state = await authenticateClerkRequest(request);
  const sessionId = state?.toAuth()?.sessionId;
  if (!sessionId) {
    return false;
  }

  const clerkClient = getClerkBackendClient();
  if (!clerkClient) {
    return false;
  }

  await clerkClient.sessions.revokeSession(sessionId);
  return true;
}

function resolveClerkImageUrl(clerkUser: ClerkUser | null) {
  const primary = clerkUser?.imageUrl?.trim();
  if (primary) {
    return primary;
  }

  for (const account of clerkUser?.externalAccounts ?? []) {
    const url = account.imageUrl?.trim();
    if (url) {
      return url;
    }
  }

  return null;
}

export async function getClerkStudentContext(request?: Request) {
  if (!isClerkEnabled()) {
    return null;
  }

  const userId = await resolveClerkAuthUserId(request);
  if (!userId) {
    return null;
  }

  const cachedProfile = await getCachedProfileByClerkUserId(userId);

  let profile = cachedProfile?.role === "student" ? cachedProfile : null;
  let email = profile?.email?.trim() ?? null;

  let clerkUser: ClerkUser | null = null;
  const clerkClient = getClerkBackendClient();
  if (clerkClient) {
    clerkUser = (await withAuthTimeout(clerkClient.users.getUser(userId), 3_000).catch(
      () => null,
    )) ?? null;
  }

  if (!email) {
    email =
      clerkUser?.emailAddresses.find((entry) => entry.id === clerkUser?.primaryEmailAddressId)
        ?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress ??
      null;
  }

  if (!email) {
    return null;
  }

  if (!profile) {
    const clerkUserName = [clerkUser?.firstName, clerkUser?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    profile = await resolveClerkStudentProfile(userId, email, {
      displayName: clerkUserName || undefined,
    });
    if (profile) {
      invalidateClerkProfileCache(userId);
    }
  }

  const parsedName = profile?.displayName
    ? parseStudentDisplayName(profile.displayName)
    : { firstName: "", lastName: "" };

  return {
    clerkUserId: userId,
    email,
    firstName: clerkUser?.firstName ?? (parsedName.firstName || null),
    lastName: clerkUser?.lastName ?? (parsedName.lastName || null),
    imageUrl: clerkUser ? resolveClerkImageUrl(clerkUser) : null,
    displayName:
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
      profile?.displayName?.trim() ||
      email.split("@")[0],
    profile,
  };
}

export async function getRequestUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getStudentRequestUser(request?: Request): Promise<{ id: string; email: string } | null> {
  if (isClerkEnabled()) {
    const userId = await resolveClerkAuthUserId(request);
    if (userId) {
      const cachedProfile = await getCachedProfileByClerkUserId(userId);
      if (cachedProfile?.role === "student") {
        return {
          id: cachedProfile.id,
          email: cachedProfile.email,
        };
      }

      const clerkStudent = await getClerkStudentContext(request);
      if (!clerkStudent?.profile || clerkStudent.profile.role !== "student") {
        return null;
      }

      return {
        id: clerkStudent.profile.id,
        email: clerkStudent.profile.email,
      };
    }

    const user = await getRequestUser();
    if (!user?.id || !user.email) {
      return null;
    }

    const profile = await getProfileByUserId(user.id);
    if (!profile || profile.role !== "student") {
      return null;
    }

    return { id: user.id, email: user.email };
  }

  const user = await getRequestUser();
  if (!user?.id || !user.email) {
    return null;
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile || profile.role !== "student") {
    return null;
  }

  return { id: user.id, email: user.email };
}

export async function getProfileByUserId(userId: string) {
  if (isBackendEnabled()) {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    return profile ?? null;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.from("profiles" as never).select("*").eq("id", userId).maybeSingle();
  return (data as typeof profiles.$inferSelect | null) ?? null;
}

const STAFF_ROLES: AppRole[] = ["admin", "referent", "kitchen"];

export function isStaffRole(role: AppRole | undefined | null) {
  return role != null && STAFF_ROLES.includes(role);
}

export async function getSupabaseAuthSessionPayload() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getProfileByUserId(user.id);
  const displayName = profile?.displayName ?? "";
  const nameParts = displayName.trim().split(/\s+/);

  return {
    user: {
      id: user.id,
      email: user.email,
      emailConfirmed: Boolean(user.email_confirmed_at),
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" "),
      avatarUrl: user.email
        ? resolveStudentAvatarUrl({
            email: user.email,
            firstName: nameParts[0] ?? "",
            lastName: nameParts.slice(1).join(" "),
            displayName,
          })
        : undefined,
    },
    profile,
  };
}

export async function requireUser() {
  const user = await getRequestUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

export async function requireRole(allowed: AppRole | AppRole[]) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const profile = await getProfileByUserId(auth.user.id);
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!profile || !roles.includes(profile.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: auth.user, profile };
}

export async function requireKitchenStaff() {
  const user = await getRequestUser();
  if (user) {
    const profile = await getProfileByUserId(user.id);
    if (profile && (profile.role === "kitchen" || profile.role === "admin")) {
      return { user, profile };
    }
  }

  const cookieStore = await cookies();
  const demoSession = parseKitchenDemoCookie(cookieStore.get(KUHINJA_DEMO_COOKIE)?.value);
  if (demoSession) {
    return { demoSession };
  }

  if (user) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export async function requireKitchenModerator() {
  const user = await getRequestUser();
  if (user) {
    const profile = await getProfileByUserId(user.id);
    if (profile && (profile.role === "admin" || (profile.role === "kitchen" && profile.kitchenRole === "moderator"))) {
      return { user, profile };
    }
  }

  const cookieStore = await cookies();
  const demoSession = parseKitchenDemoCookie(cookieStore.get(KUHINJA_DEMO_COOKIE)?.value);
  if (demoSession && demoSession.role === "moderator") {
    return { demoSession };
  }

  if (user) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
