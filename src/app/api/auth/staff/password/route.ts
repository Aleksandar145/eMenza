import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureBackendEnabled } from "@/server/api/guard";
import { parseJsonBody } from "@/server/api/request";
import { jsonError, jsonOk } from "@/server/auth/session";

const staffPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const parsed = await parseJsonBody(request, staffPasswordSchema);
  if ("error" in parsed) return parsed.error;

  const { newPassword } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return jsonError("Auth unavailable", 503);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return jsonError("Niste prijavljeni.", 401);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });

    if (updateError) {
      console.error("[staff/password] update error:", updateError);
      return jsonError("Greška pri promeni lozinke.", 500);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[staff/password POST]", error);
    return jsonError("Greška pri promeni lozinke.", 500);
  }
}
