import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { userDishRankings } from "@/server/db/schema";

const slotSchema = z.object({
  dishId: z.string(),
  rank: z.number().int().positive(),
});

const bodySchema = z.object({
  main: z.array(slotSchema).default([]),
  side: z.array(slotSchema).default([]),
  salad: z.array(slotSchema).default([]),
  dessert: z.array(slotSchema).default([]),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const user = await getStudentRequestUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid request body", 400);
    }

    const { main, side, salad, dessert } = parsed.data;
    const slots = { main, side, salad, dessert } as const;
    const db = getDb();

    // Remove all existing rankings for this user, then insert fresh ones
    await db.transaction(async (tx) => {
      await tx
        .delete(userDishRankings)
        .where(eq(userDishRankings.profileId, user.id));

      const rows: typeof userDishRankings.$inferInsert[] = [];
      for (const [slotId, rankings] of Object.entries(slots)) {
        for (const r of rankings) {
          rows.push({
            profileId: user.id,
            slotId: slotId as "main" | "side" | "salad" | "dessert",
            dishId: r.dishId,
            rankPosition: r.rank,
          });
        }
      }

      if (rows.length > 0) {
        await tx.insert(userDishRankings).values(rows);
      }
    });

    return jsonOk({ synced: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Sinhronizacija preferenci nije uspela.",
      400,
    );
  }
}
