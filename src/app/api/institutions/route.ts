import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { institutions } from "@/server/db/schema";

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  try {
    const db = getDb();
    const rows = await db
      .select({ name: institutions.name, type: institutions.type, city: institutions.city })
      .from(institutions)
      .orderBy(institutions.name);
    return jsonOk({ institutions: rows });
  } catch (error) {
    console.error("[institutions public GET]", error);
    return jsonError("Greška pri učitavanju institucija.", 500);
  }
}
