import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { fetchAdminSystemState, saveAdminConfigPartial } from "@/server/repositories/admin";

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["kuvar", "salter"]),
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
    body = roleSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    const db = getDb();
    const [target] = await db
      .select({ id: profiles.id, role: profiles.role, kitchenRole: profiles.kitchenRole })
      .from(profiles)
      .where(eq(profiles.id, body.userId))
      .limit(1);

    if (!target) {
      return jsonError("Zaposleni nije pronađen.", 404);
    }

    if (target.role === "admin") {
      return jsonError("Ne možete menjati ulogu administratora.", 403);
    }

    if (target.role === "kitchen" && target.kitchenRole === "moderator") {
      return jsonError("Ne možete menjati ulogu drugog moderatora.", 403);
    }

    if ("user" in auth && auth.user?.id === target.id) {
      return jsonError("Ne možete menjati sopstvenu ulogu.", 403);
    }

    await db
      .update(profiles)
      .set({ kitchenRole: body.role, updatedAt: new Date() })
      .where(eq(profiles.id, body.userId));

    try {
      const supabase = createSupabaseAdminClient();
      if (supabase) {
        await supabase.auth.admin.updateUserById(body.userId, {
          user_metadata: { role: "kitchen", kitchen_role: body.role },
        });
      }
    } catch {
      // Non-critical metadata update
    }

    // Keep the admin system staff list (role resolution source) in sync.
    try {
      const state = await fetchAdminSystemState();
      const updatedStaff = state.staff.map((s) =>
        s.supabaseUserId === body.userId ? { ...s, role: body.role } : s,
      );
      await saveAdminConfigPartial({ staff: updatedStaff });
    } catch {
      // Non-critical — profiles is the source of truth for role resolution
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[kitchen/staff role PATCH]", error);
    return jsonError(error instanceof Error ? error.message : "Nepoznata greška", 500);
  }
}
