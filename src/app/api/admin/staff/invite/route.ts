import { z } from "zod";
import { randomUUID } from "crypto";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["referent", "employee", "admin", "kitchen"]),
  kitchenRole: z.enum(["kuvar", "salter", "none"]).optional(),
  password: z.string().min(6).optional(),
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
    body = inviteSchema.parse(await request.json());
  } catch (parseErr) {
    if (parseErr instanceof z.ZodError) {
      return jsonError(parseErr.issues[0]?.message ?? "Invalid input", 400);
    }
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return jsonError("Server nije konfigurisan", 503);
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();
    if (existing) {
      return jsonError("Korisnik sa ovom email adresom već postoji", 409);
    }

    const password = body.password ?? randomUUID();
    const appRole = body.role === "employee" ? "referent" : body.role;

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: body.displayName, role: appRole, must_change_password: true },
    });

    if (createError || !authUser.user) {
      throw new Error(createError?.message || "Failed to create auth user");
    }

    const { error: insertError } = await supabase
      .from("profiles" as never)
      .insert({
        id: authUser.user.id,
        email: body.email,
        display_name: body.displayName,
        role: appRole,
        kitchen_role: body.kitchenRole === "none" || !body.kitchenRole ? null : body.kitchenRole,
      } as never);

    if (insertError) {
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(insertError.message);
    }

    return jsonOk({ supabaseUserId: authUser.user.id, password }, 201);
  } catch (err) {
    console.error("[INVITE] Greška:", err);
    return jsonError(err instanceof Error ? err.message : "Nepoznata greška", 500);
  }
}
