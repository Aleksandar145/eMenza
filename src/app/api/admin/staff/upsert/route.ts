import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { fetchAdminSystemState, saveAdminConfigPartial } from "@/server/repositories/admin";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";
import type { StaffMember } from "@/lib/admin-system-mock";

const upsertSchema = z.object({
  staff: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    active: z.boolean(),
    createdAt: z.string(),
    demoPassword: z.string().optional(),
    mustChangePassword: z.boolean().optional(),
    supabaseUserId: z.string().optional(),
    suspendedReason: z.string().optional(),
    lastLoginAt: z.string().nullable().optional(),
    lastLogoutAt: z.string().nullable().optional(),
  })),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  let body;
  try {
    body = upsertSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    let previousByEmail = new Map<string, boolean>();
    try {
      const prior = await fetchAdminSystemState();
      previousByEmail = new Map(
        prior.staff
          .filter((s) => s.email)
          .map((s) => [s.email.toLowerCase(), s.active]),
      );
    } catch {
      // Non-critical — best effort comparison
    }

    const state = await saveAdminConfigPartial({ staff: body.staff as StaffMember[] });

    // Keep profiles.active and the auth ban in lockstep with the config flag so
    // that a moderator/administrator suspension and an administrator reactivation
    // converge on the same data model. This is non-critical for the login gate
    // (which reads config), but keeps every source consistent.
    try {
      const db = getDb();
      const supabase = createSupabaseAdminClient();
      for (const member of body.staff) {
        if (!member.supabaseUserId) continue;

        await db
          .update(profiles)
          .set({
            active: member.active,
            suspendedReason: member.active
              ? null
              : (member.suspendedReason?.trim() || null),
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, member.supabaseUserId));

        if (supabase) {
          await supabase.auth.admin.updateUserById(member.supabaseUserId, {
            ban_duration: member.active ? "none" : "876000h",
            user_metadata: {
              active: member.active,
              suspended_reason: member.active
                ? null
                : (member.suspendedReason?.trim() || null),
            },
          });
        }
      }
    } catch {
      // Non-critical — config remains the login gate's source of truth
    }

    // Beleži u dnevnik samo stvarne promene statusa (suspendovano/ponovo aktivirano).
    const actorSession = ("session" in auth ? auth.session : null) as { displayName?: string } | null;
    const actorName = actorSession?.displayName;
    const actorId = "user" in auth && auth.user ? auth.user.id : undefined;
    for (const member of body.staff) {
      const email = member.email?.toLowerCase();
      const prev = email ? previousByEmail.get(email) : undefined;
      if (prev === undefined || prev === member.active) continue;

      await appendActivityLogDb({
        userId: actorId,
        actionType: member.active ? "staff.reactivate" : "staff.suspend",
        description: member.active
          ? `Administrator ${actorName ?? "sistema"} je ponovo aktivirao nalog „${member.name}” (${member.email}).`
          : `Administrator ${actorName ?? "sistema"} je suspendovao nalog „${member.name}” (${member.email})${
              member.suspendedReason?.trim()
                ? ` (razlog: ${member.suspendedReason.trim()})`
                : ""
            }.`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    }

    return jsonOk({ staff: state.staff });
  } catch (err) {
    console.error("[UPSERT STAFF] Greška:", err);
    return jsonError(err instanceof Error ? err.message : "Nepoznata greška", 500);
  }
}
