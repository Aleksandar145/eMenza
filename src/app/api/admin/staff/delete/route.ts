import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";

const deleteSchema = z.object({
  supabaseUserId: z.string().min(1),
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
    body = deleteSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return jsonError("Server nije konfigurisan", 503);
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(body.supabaseUserId);
    if (deleteAuthError && !/not found|404/i.test(deleteAuthError.message)) {
      throw new Error(deleteAuthError.message);
    }

    const db = getDb();
    await db.delete(profiles).where(eq(profiles.id, body.supabaseUserId));

    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[DELETE STAFF] Greška:", err);
    return jsonError(err instanceof Error ? err.message : "Nepoznata greška", 500);
  }
}
