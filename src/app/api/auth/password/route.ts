import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureBackendEnabled } from "@/server/api/guard";
import { parseJsonBody } from "@/server/api/request";
import { getClerkStudentContext, getProfileByUserId, isClerkRequestSignedIn, jsonOk } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const parsed = await parseJsonBody(request, passwordSchema);
  if ("error" in parsed) {
    return parsed.error;
  }

  const { currentPassword, newPassword } = parsed.data;

  if (newPassword === currentPassword) {
    return jsonStudentError(null, "passwordMustDiffer", 400);
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return jsonStudentError(user.id, "passwordCurrentInvalid", 401);
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return jsonStudentError(user.id, "passwordUpdateFailed", 400);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[auth/password POST]", error);
    return jsonStudentError(null, "passwordUpdateFailed", 500);
  }
}
