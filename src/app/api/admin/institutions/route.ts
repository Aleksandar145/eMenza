import { z } from "zod";
import { sql } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { institutions, profiles } from "@/server/db/schema";

const createSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan."),
  type: z.enum(["fakultet", "skola"]),
  city: z.string().optional().default(""),
});

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: institutions.id,
        name: institutions.name,
        type: institutions.type,
        city: institutions.city,
        createdAt: institutions.createdAt,
        updatedAt: institutions.updatedAt,
        userCount:
          sql<number>`count(*) filter (where ${profiles.role} = 'student')::int`,
      })
      .from(institutions)
      .leftJoin(
        profiles,
        sql`${profiles.faculty} = ${institutions.name} OR ${profiles.faculty} LIKE ${institutions.name} || ',%'`,
      )
      .groupBy(institutions.id)
      .orderBy(institutions.name);
    return jsonOk({ institutions: rows });
  } catch (error) {
    console.error("[institutions GET]", error);
    return jsonError("Greška pri učitavanju institucija.", 500);
  }
}

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  try {
    const body = createSchema.parse(await request.json());
    const db = getDb();
    const [created] = await db.insert(institutions).values(body).returning();
    return jsonOk({ institution: created }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid input", 400);
    }
    console.error("[institutions POST]", error);
    return jsonError("Greška pri kreiranju institucije.", 500);
  }
}
