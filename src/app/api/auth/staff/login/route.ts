import { z } from "zod";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureBackendEnabled } from "@/server/api/guard";
import { parseJsonBody } from "@/server/api/request";
import { getProfileByUserId, jsonError, jsonOk, type AppRole } from "@/server/auth/session";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";
import { updateStaffMemberFieldInConfig } from "@/server/repositories/admin";
import { getDb } from "@/server/db";
import { appConfig } from "@/server/db/schema";

const CONFIG_KEY = "admin_system";

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "referent", "kitchen"]),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const parsed = await parseJsonBody(request, staffLoginSchema);
  if ("error" in parsed) {
    return parsed.error;
  }

  const body = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError("Auth unavailable", 503);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.user) {
      return jsonError("Pogrešan email ili lozinka.", 401);
    }

    const profile = await getProfileByUserId(data.user.id);
    if (!profile || profile.role !== (body.role as AppRole)) {
      await supabase.auth.signOut();
      return jsonError("Nemate pristup ovom panelu.", 403);
    }

    let active = true;
    let suspendedReason: string | undefined;
    try {
      const db = getDb();
      const [row] = await db.select().from(appConfig).where(eq(appConfig.key, CONFIG_KEY)).limit(1);
      if (row?.value) {
        const config = row.value as { staff?: Array<{ email: string; active: boolean; suspendedReason?: string }> };
        const staffMember = config.staff?.find((s) => s.email.toLowerCase() === body.email.toLowerCase());
        if (staffMember) {
          active = staffMember.active;
          suspendedReason = staffMember.suspendedReason;
        }
      }
    } catch {
      // Ignore config read error — allow login
    }

    if (!active) {
      await supabase.auth.signOut();
      return jsonOk({ suspended: true, displayName: profile.displayName, suspendedReason }, 200);
    }

    try {
      await updateStaffMemberFieldInConfig(body.email, { lastLoginAt: new Date().toISOString() });
    } catch {
      // Non-critical update
    }

    await appendActivityLogDb({
      userId: profile.id,
      actionType: "login",
      description: `Prijava na ${body.role} panel: ${profile.displayName} (${profile.email})`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    return jsonOk({
      session: {
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        kitchenRole: profile.kitchenRole,
        mustChangePassword: data.user.user_metadata?.must_change_password === true,
        loggedInAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[staff/login]", error);
    return jsonError("Prijava trenutno nije dostupna. Pokušajte ponovo.", 500);
  }
}
