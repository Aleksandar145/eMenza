import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";
import {
  fetchAdminSystemState,
  publishNoticeDb,
  saveAdminConfigPartial,
} from "@/server/repositories/admin";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";

const statusSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
  reason: z.string().max(300).optional(),
});

export async function PATCH(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenModerator();
  if ("error" in auth) {
    return auth.error;
  }

  let body;
  try {
    body = statusSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    const db = getDb();
    const [target] = await db
      .select({
        id: profiles.id,
        role: profiles.role,
        kitchenRole: profiles.kitchenRole,
        email: profiles.email,
        displayName: profiles.displayName,
      })
      .from(profiles)
      .where(eq(profiles.id, body.userId))
      .limit(1);

    if (!target) {
      return jsonError("Zaposleni nije pronađen.", 404);
    }

    if (target.role === "admin") {
      return jsonError("Ne možete menjati status administratora.", 403);
    }

    if (target.role === "kitchen" && target.kitchenRole === "moderator") {
      return jsonError("Ne možete suspendovati drugog moderatora.", 403);
    }

    if ("user" in auth && auth.user?.id === target.id) {
      return jsonError("Ne možete menjati sopstveni status.", 403);
    }

    await db
      .update(profiles)
      .set({
        active: body.active,
        suspendedReason: body.active ? null : body.reason?.trim() ?? null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, body.userId));

    const actorId = "user" in auth && auth.user ? auth.user.id : undefined;
    const actorName = "profile" in auth ? auth.profile?.displayName : undefined;
    const targetName = target.displayName ?? target.email ?? body.userId;
    await appendActivityLogDb({
      userId: actorId,
      actionType: body.active ? "staff.reactivate" : "staff.suspend",
      description: body.active
        ? `Moderator ${actorName ?? "kuhinje"} je ponovo aktivirao nalog „${targetName}”.`
        : `Moderator ${actorName ?? "kuhinje"} je suspendovao nalog „${targetName}”${
            body.reason?.trim() ? ` (razlog: ${body.reason.trim()})` : ""
          }.`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    try {
      const supabase = createSupabaseAdminClient();
      if (supabase) {
        const banDuration = body.active ? "none" : "876000h";
        await supabase.auth.admin.updateUserById(body.userId, {
          ban_duration: banDuration,
          user_metadata: {
            active: body.active,
            suspended_reason: body.active ? null : body.reason?.trim() ?? null,
          },
        });
      }
    } catch {
      // Non-critical auth-level update
    }

    // Keep the admin system staff list in sync so login enforcement (which reads
    // app_config.staff[].active and matches by email) blocks suspended employees.
    try {
      const state = await fetchAdminSystemState();
      const targetEmail = target.email?.toLowerCase();
      const updatedStaff = state.staff.map((s) => {
        const matchesEmail = !!targetEmail && s.email?.toLowerCase() === targetEmail;
        return s.supabaseUserId === body.userId || matchesEmail
          ? {
              ...s,
              active: body.active,
              suspendedReason: body.active ? undefined : body.reason?.trim() || undefined,
            }
          : s;
      });
      await saveAdminConfigPartial({ staff: updatedStaff });
    } catch {
      // Non-critical — profiles is the source of truth for status
    }

    // When a moderator suspends an employee, notify the admin so they can review
    // and unblock the account from /admin/zaposleni.
    if (!body.active) {
      try {
        const moderatorName = "profile" in auth ? auth.profile?.displayName : undefined;
        await publishNoticeDb({
          id: crypto.randomUUID(),
          title: "Suspendovan zaposleni",
          message: `Moderator ${moderatorName ?? "kuhinje"} je suspendovao zaposlenog „${
            target.displayName
          }”. Odblokirajte nalog iz odeljka Zaposleni ako je potrebno.`,
          time: new Intl.DateTimeFormat("sr-RS", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date()),
          priority: "important",
          target: ["admin"],
          publishedAt: new Date().toISOString(),
          archived: false,
          displayMode: "standard",
          actionHref: "/admin/zaposleni",
          actionLabel: "Otvori zaposlene",
          authorName: moderatorName,
        });
      } catch {
        // Non-critical — notification only
      }
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[kitchen/staff status PATCH]", error);
    return jsonError(error instanceof Error ? error.message : "Nepoznata greška", 500);
  }
}
