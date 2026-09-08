import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";

const updateRoleSchema = z.object({
  supabaseUserId: z.string().min(1),
  role: z.enum(["admin", "referent", "kuvar", "salter", "moderator"]),
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
    body = updateRoleSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    const db = getDb();
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return jsonError("Server nije konfigurisan", 503);
    }

    const profileRole = body.role === "kuvar" || body.role === "salter" || body.role === "moderator" ? "kitchen" : body.role;
    const kitchenRole = body.role === "kuvar" ? "kuvar" : body.role === "salter" ? "salter" : body.role === "moderator" ? "moderator" : null;

    await db
      .update(profiles)
      .set({ role: profileRole as "admin" | "referent" | "kitchen", kitchenRole, updatedAt: new Date() })
      .where(eq(profiles.id, body.supabaseUserId));

    const { error: metadataError } = await supabase.auth.admin.updateUserById(body.supabaseUserId, {
      user_metadata: { role: profileRole },
    });
    if (metadataError) {
      console.error("[UPDATE ROLE] Metadata error:", metadataError);
    }

    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[UPDATE ROLE] Greška:", err);
    return jsonError(err instanceof Error ? err.message : "Nepoznata greška", 500);
  }
}
