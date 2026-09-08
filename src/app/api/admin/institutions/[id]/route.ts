import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { institutions } from "@/server/db/schema";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const db = getDb();
    const [deleted] = await db.delete(institutions).where(eq(institutions.id, id)).returning();

    if (!deleted) {
      return jsonError("Institucija nije pronađena.", 404);
    }

    return jsonOk({ deleted: true });
  } catch (error) {
    console.error("[institutions DELETE]", error);
    return jsonError("Greška pri brisanju institucije.", 500);
  }
}
