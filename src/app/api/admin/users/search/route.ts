import { ilike, or } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (!q || q.length < 1) {
      return jsonOk({ users: [] });
    }

    const db = getDb();
    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        displayName: profiles.displayName,
        role: profiles.role,
      })
      .from(profiles)
      .where(or(ilike(profiles.displayName, `%${q}%`), ilike(profiles.email, `%${q}%`)))
      .limit(20);

    return jsonOk({ users: rows });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Search failed", 500);
  }
}
