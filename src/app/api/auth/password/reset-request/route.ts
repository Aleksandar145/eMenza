import { buildPasswordResetRedirectUrl } from "@/lib/password-reset";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureBackendEnabled } from "@/server/api/guard";
import {
  getClerkStudentContext,
  getProfileByUserId,
  isClerkRequestSignedIn,
  jsonOk,
} from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  try {
    if (await isClerkRequestSignedIn(request)) {
      const clerkStudent = await getClerkStudentContext(request);
      const profileId = clerkStudent?.profile?.id ?? clerkStudent?.clerkUserId;
      return jsonStudentError(profileId ?? null, "passwordOAuthManaged", 403);
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonStudentError(null, "authUnavailable", 503);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return jsonStudentError(null, "unauthorized", 401);
    }

    const profile = await getProfileByUserId(user.id);
    if (!profile || profile.role !== "student") {
      return jsonStudentError(null, "unauthorized", 401);
    }

    if (profile.clerkUserId) {
      return jsonStudentError(user.id, "passwordOAuthManaged", 403);
    }

    const origin = new URL(request.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: buildPasswordResetRedirectUrl(origin),
    });

    if (error) {
      console.error("[auth/password/reset-request POST]", error);
      return jsonStudentError(user.id, "passwordResetFailed", 400);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[auth/password/reset-request POST]", error);
    return jsonStudentError(null, "passwordResetFailed", 500);
  }
}
