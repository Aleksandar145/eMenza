import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";

export type KitchenStaffProfile = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "referent" | "kitchen";
  kitchenRole: "moderator" | "kuvar" | "salter" | null;
  active: boolean;
  suspendedReason: string | null;
  createdAt: string;
};

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenModerator();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        displayName: profiles.displayName,
        role: profiles.role,
        kitchenRole: profiles.kitchenRole,
        active: profiles.active,
        suspendedReason: profiles.suspendedReason,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(eq(profiles.role, "kitchen"))
      .orderBy(profiles.displayName);

    const staff: KitchenStaffProfile[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      role: r.role as KitchenStaffProfile["role"],
      kitchenRole: (r.kitchenRole as KitchenStaffProfile["kitchenRole"]) ?? null,
      active: r.active ?? true,
      suspendedReason: r.suspendedReason ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return jsonOk({ staff });
  } catch (error) {
    console.error("[kitchen/staff GET]", error);
    return jsonError("Greška pri učitavanju liste zaposlenih.", 500);
  }
}
