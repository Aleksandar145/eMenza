import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureBackendEnabled } from "@/server/api/guard";
import { parseJsonBody } from "@/server/api/request";
import {
  getClerkRequestUserId,
  getClerkStudentContext,
  getProfileByUserId,
  getSupabaseAuthSessionPayload,
  isClerkRequestSignedIn,
  jsonError,
  jsonOk,
  revokeClerkStudentSession,
} from "@/server/auth/session";
import { resolveStudentLoginEmail } from "@/server/repositories/auth";
import { isRegistrationOnboardingPendingForProfile } from "@/server/repositories/settings";
import { getCachedProfileByClerkUserId } from "@/server/lib/clerk-profile-cache";
import { resolveStudentAvatarUrl } from "@/server/lib/student-avatar";
import { parseStudentDisplayName, resolveStudentProfileKind } from "@/lib/student-profile";
import { isClerkEnabled } from "@/server/env";
import { jsonStudentError } from "@/server/i18n/student-errors";

type ClerkStudentContext = NonNullable<Awaited<ReturnType<typeof getClerkStudentContext>>>;

async function withOnboardingPending<
  T extends {
    user: { id: string } | null;
    profile: { role: string } | null | undefined;
  },
>(payload: T) {
  if (!payload.user || payload.profile?.role !== "student") {
    return { ...payload, onboardingPending: false };
  }

  const onboardingPending = await isRegistrationOnboardingPendingForProfile(payload.user.id);
  return { ...payload, onboardingPending };
}

async function buildClerkSessionResponse(clerkStudent: ClerkStudentContext) {
  const profileRow = clerkStudent.profile;
  // displayName ima fallback na Clerk ime/prezime pa na email prefix,
  // tako da korisnik nikad ne ostane bez imena u prikazu.
  const sessionDisplayName =
    clerkStudent.displayName?.trim() ||
    profileRow?.displayName?.trim() ||
    clerkStudent.email.split("@")[0] ||
    "";
  const parsedName = parseStudentDisplayName(sessionDisplayName);
  const profile = profileRow
    ? {
        email: profileRow.email,
        displayName: sessionDisplayName,
        role: profileRow.role,
        faculty: profileRow.faculty ?? null,
        indexNumber: profileRow.indexNumber ?? null,
        studentKind: resolveStudentProfileKind({
          indexNumber: profileRow.indexNumber,
          generation: null,
        }),
      }
    : null;

  return jsonOk({
    ...(await withOnboardingPending({
      user: {
        id: profileRow?.id ?? clerkStudent.clerkUserId,
        email: clerkStudent.email,
        emailConfirmed: true,
        firstName: clerkStudent.firstName?.trim() || parsedName.firstName || null,
        lastName: clerkStudent.lastName?.trim() || parsedName.lastName || null,
        avatarUrl: resolveStudentAvatarUrl({
          email: clerkStudent.email,
          oauthImageUrl: clerkStudent.imageUrl,
          firstName: clerkStudent.firstName ?? parsedName.firstName ?? "",
          lastName: clerkStudent.lastName ?? parsedName.lastName ?? "",
          displayName: sessionDisplayName,
        }),
      },
      profile,
    })),
    authProvider: "oauth" as const,
    canChangePassword: false,
  });
}

async function buildClerkProfileFallbackResponse(request: Request) {
  const clerkUserId = await getClerkRequestUserId(request);
  if (!clerkUserId) {
    return null;
  }

  const profileRow = await getCachedProfileByClerkUserId(clerkUserId);
  
  // Ako profil ne postoji ili nije student, vratimo prazan, ali validan odgovor
  // kako TypeScript ne bi prijavljivao "null" greške
  if (!profileRow || profileRow.role !== "student") {
    return jsonOk({
      user: null,
      profile: null,
      onboardingPending: false,
      authProvider: "oauth" as const,
      canChangePassword: false,
    });
  }

  const sessionDisplayName =
    profileRow.displayName?.trim() || profileRow.email.split("@")[0] || "";
  const parsedName = parseStudentDisplayName(sessionDisplayName);

  return jsonOk({
    ...(await withOnboardingPending({
      user: {
        id: profileRow.id,
        email: profileRow.email,
        emailConfirmed: true,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        avatarUrl: resolveStudentAvatarUrl({
          email: profileRow.email,
          firstName: parsedName.firstName,
          lastName: parsedName.lastName,
          displayName: sessionDisplayName,
        }),
      },
      profile: {
        email: profileRow.email,
        displayName: sessionDisplayName,
        role: profileRow.role,
        faculty: profileRow.faculty ?? null,
        indexNumber: profileRow.indexNumber ?? null,
        studentKind: resolveStudentProfileKind({
          indexNumber: profileRow.indexNumber,
          generation: null,
        }),
      },
    })),
    authProvider: "oauth" as const,
    canChangePassword: false,
  });
}

export async function GET(request: Request) {
  
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  try {
    if (isClerkEnabled()) {
      const clerkStudent = await getClerkStudentContext(request);
      if (clerkStudent) {
        return await buildClerkSessionResponse(clerkStudent);
      }

      if (await isClerkRequestSignedIn(request)) {
        const clerkFallback = await buildClerkProfileFallbackResponse(request);
        if (clerkFallback) {
          return clerkFallback;
        }

        const clerkRetry = await getClerkStudentContext(request);
        if (clerkRetry) {
          return buildClerkSessionResponse(clerkRetry);
        }

        return jsonOk({
          user: null,
          profile: null,
          onboardingPending: false,
          authProvider: "oauth" as const,
          canChangePassword: false,
        });
      }

      const supabaseSession = await getSupabaseAuthSessionPayload();
      if (!supabaseSession) {
        return jsonOk({ user: null, profile: null, onboardingPending: false });
      }

      return jsonOk({
        ...(await withOnboardingPending(supabaseSession)),
        authProvider: "password" as const,
        canChangePassword: true,
      });
    }

    const supabaseSession = await getSupabaseAuthSessionPayload();

    if (!supabaseSession) {
      return jsonOk({ user: null, profile: null, onboardingPending: false });
    }

    return jsonOk({
      ...(await withOnboardingPending(supabaseSession)),
      authProvider: "password" as const,
      canChangePassword: true,
    });
  } catch (error) {
    console.error("[auth/session GET]", error);
    return jsonStudentError(null, "sessionUnavailable", 500);
  }
}

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const parsed = await parseJsonBody(request, loginSchema);
  if ("error" in parsed) {
    return parsed.error;
  }

  const body = parsed.data;

  try {
    const email = await resolveStudentLoginEmail(body.identifier);
    if (!email) {
      return jsonStudentError(null, "invalidCredentials", 401);
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonStudentError(null, "authUnavailable", 503);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: body.password,
    });

    if (error || !data.user) {
      return jsonStudentError(null, "invalidCredentials", 401);
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return jsonStudentError(null, "emailNotVerified", 403);
    }

    const profile = await getProfileByUserId(data.user.id);
    if (!profile || profile.role !== "student") {
      await supabase.auth.signOut();
      return jsonStudentError(null, "invalidCredentials", 401);
    }

    const displayName = profile.displayName ?? "";
    const nameParts = displayName.trim().split(/\s+/);

    return jsonOk({
      ...(await withOnboardingPending({
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: true,
          firstName: nameParts[0] ?? "",
          lastName: nameParts.slice(1).join(" "),
          avatarUrl: data.user.email
            ? resolveStudentAvatarUrl({
                email: data.user.email,
                firstName: nameParts[0] ?? "",
                lastName: nameParts.slice(1).join(" "),
                displayName,
              })
            : undefined,
        },
        profile,
      })),
      authProvider: "password" as const,
      canChangePassword: true,
    });
  } catch (error) {
    console.error("[auth/session POST]", error);
    return jsonStudentError(null, "authUnavailable", 500);
  }
}

export async function DELETE(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  try {
    if (isClerkEnabled()) {
      await revokeClerkStudentSession(request);
      return NextResponse.json({ ok: true });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError("Auth unavailable", 503);
    }

    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Odjava nije uspela.", 500);
  }
}
