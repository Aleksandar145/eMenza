import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getSupabaseAuthSessionPayload, isStaffRole, jsonError, jsonOk } from "@/server/auth/session";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";
import { updateStaffMemberFieldInConfig } from "@/server/repositories/admin";

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const supabaseSession = await getSupabaseAuthSessionPayload();
  if (!supabaseSession?.profile || !isStaffRole(supabaseSession.profile.role)) {
    return jsonOk({ user: null, profile: null });
  }

  return jsonOk(supabaseSession);
}

export async function DELETE(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return jsonError("Auth unavailable", 503);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    const { getProfileByUserId } = await import("@/server/auth/session");
    const profile = await getProfileByUserId(user.id);
    const email = profile?.email ?? user.email;
    if (email) {
      try {
        await updateStaffMemberFieldInConfig(email, { lastLogoutAt: new Date().toISOString() });
      } catch {
        // Non-critical update
      }
    }

    try {
      await appendActivityLogDb({
        userId: user.id,
        actionType: "logout",
        description: `Odjava sa ${profile?.role ?? ""} panela: ${profile?.displayName ?? email}`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    } catch {
      // Non-critical — log is best-effort
    }
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
