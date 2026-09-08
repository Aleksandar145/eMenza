import { count, eq, sql } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { dailyMenuSlotDishes, dishes, mealReservations } from "@/server/db/schema";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const categoryFilter = searchParams.get("category")?.trim() || null;

  try {
    const db = getDb();

    // 1. Ukupna kolicina stavljena u promet (sum stock-a iz dailyMenuSlotDishes)
    const circulationQuery = db
      .select({
        id: dishes.id,
        name: dishes.name,
        category: dishes.category,
        priceRsd: dishes.priceRsd,
        totalStock: sql<number>`COALESCE(SUM(${dailyMenuSlotDishes.stock}), 0)`,
      })
      .from(dishes)
      .leftJoin(dailyMenuSlotDishes, eq(dishes.id, dailyMenuSlotDishes.dishId));

    if (categoryFilter) {
      circulationQuery.where(eq(dishes.category, categoryFilter as any));
    }

    const circulation = await circulationQuery
      .groupBy(dishes.id)
      .orderBy(sql`COALESCE(SUM(${dailyMenuSlotDishes.stock}), 0) DESC`);

    // 2. Broj prodatih porcija iz rezervacija
    const glavnoRows = await db
      .select({ name: mealReservations.glavnoJelo, count: count() })
      .from(mealReservations)
      .groupBy(mealReservations.glavnoJelo);

    const dodatakRows = await db
      .select({ name: mealReservations.dodatak, count: count() })
      .from(mealReservations)
      .groupBy(mealReservations.dodatak);

    const salataRows = await db
      .select({ name: mealReservations.salata, count: count() })
      .from(mealReservations)
      .groupBy(mealReservations.salata);

    const obrokRows = await db
      .select({ name: mealReservations.obrok, count: count() })
      .from(mealReservations)
      .groupBy(mealReservations.obrok);

    // 3. Kombinuj sve brojeve u mapu
    const soldMap = new Map<string, number>();
    for (const rows of [glavnoRows, dodatakRows, salataRows, obrokRows]) {
      for (const r of rows) {
        const name = r.name?.trim();
        if (name) {
          soldMap.set(name, (soldMap.get(name) ?? 0) + Number(r.count));
        }
      }
    }

    // 4. Formiraj rezultat
    const result = circulation.map((d) => {
      const totalCirculation = Number(d.totalStock);
      const totalSold = soldMap.get(d.name) ?? 0;
      const remaining = Math.max(0, totalCirculation - totalSold);
      return {
        id: d.id,
        name: d.name,
        category: d.category,
        priceRsd: Number(d.priceRsd),
        totalCirculation,
        totalSold,
        remaining,
      };
    });

    return jsonOk(result);
  } catch (error) {
    console.error("[admin/monitoring/dishes GET]", error);
    return jsonError("Greška pri učitavanju analize jela.", 500);
  }
}
