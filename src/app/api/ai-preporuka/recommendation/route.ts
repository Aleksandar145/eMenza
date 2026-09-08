import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MealType } from "@/lib/meal-types";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";

const querySchema = z.object({
  dateKey: z.string().min(1),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
  posnoRequired: z.enum(["0", "1"]).default("0"),
  forceNonPosno: z.enum(["0", "1"]).default("0"),
});

export type AiRecommendationRpcRow = {
  slot_id: "main" | "side" | "salad" | "dessert";
  dish_id: string;
  dish_name: string;
  rank_position: number;
  price_rsd: number;
  badges: string[] | null;
  stock: number;
  reason: string;
};

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    dateKey: searchParams.get("dateKey"),
    mealType: searchParams.get("mealType"),
    posnoRequired: searchParams.get("posnoRequired") ?? "0",
    forceNonPosno: searchParams.get("forceNonPosno") ?? "0",
  });

  if (!parsed.success) {
    return jsonError("Neispravni parametri za AI preporuku.", 400);
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  if (!supabase) {
    return jsonError("Supabase nije konfigurisan.", 503);
  }

  const { dateKey, mealType, posnoRequired, forceNonPosno } = parsed.data;
  const { data, error } = await supabase.rpc("get_ai_recommendation", {
    p_profile_id: user.id,
    p_date_key: dateKey,
    p_meal_type: mealType as MealType,
    p_posno_required: posnoRequired === "1",
    p_force_non_posno: forceNonPosno === "1",
  });

  if (error) {
    console.error("[GET /api/ai-preporuka/recommendation]", error);
    return jsonError("AI preporuka trenutno nije dostupna.", 500);
  }

  return jsonOk({ rows: (data ?? []) as AiRecommendationRpcRow[] });
}
