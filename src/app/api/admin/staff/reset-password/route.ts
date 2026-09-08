import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const resetPasswordSchema = z.object({
  supabaseUserId: z.string().min(1),
  password: z.string().min(6),
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
    body = resetPasswordSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return jsonError("Server nije konfigurisan", 503);
    }

    const { error } = await supabase.auth.admin.updateUserById(body.supabaseUserId, {
      password: body.password,
      user_metadata: { must_change_password: true },
    });

    if (error) {
      throw new Error(error.message);
    }

    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[RESET PASSWORD] Greška:", err);
    return jsonError(err instanceof Error ? err.message : "Nepoznata greška", 500);
  }
}
