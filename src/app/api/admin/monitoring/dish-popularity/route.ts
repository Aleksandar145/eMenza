import { sql } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";

export type DishPopularityRow = {
  dishId: string;
  dishName: string;
  category: "main" | "side" | "salad" | "dessert";
  totalVotes: number;
  rank1Count: number;
  rank2Count: number;
  rank3Count: number;
  rank4Count: number;
  rank5Count: number;
  avgRank: number;
};

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin", "referent", "kitchen"]);
  if ("error" in auth) return auth.error;

  const db = getDb();

  const rows = await db.execute(sql`
    SELECT
      d.id AS dish_id,
      d.name AS dish_name,
      d.category,
      COUNT(udr.id)::int AS total_votes,
      COALESCE(SUM(CASE WHEN udr.rank_position = 1 THEN 1 ELSE 0 END)::int, 0) AS rank1_count,
      COALESCE(SUM(CASE WHEN udr.rank_position = 2 THEN 1 ELSE 0 END)::int, 0) AS rank2_count,
      COALESCE(SUM(CASE WHEN udr.rank_position = 3 THEN 1 ELSE 0 END)::int, 0) AS rank3_count,
      COALESCE(SUM(CASE WHEN udr.rank_position = 4 THEN 1 ELSE 0 END)::int, 0) AS rank4_count,
      COALESCE(SUM(CASE WHEN udr.rank_position = 5 THEN 1 ELSE 0 END)::int, 0) AS rank5_count,
      ROUND(AVG(udr.rank_position)::numeric, 2)::float8 AS avg_rank
    FROM dishes d
    LEFT JOIN user_dish_rankings udr ON udr.dish_id = d.id
    GROUP BY d.id, d.name, d.category
    ORDER BY d.category, avg_rank ASC
  `);

  return jsonOk([...rows] as DishPopularityRow[]);
}
