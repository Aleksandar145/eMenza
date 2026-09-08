import type { MealType } from "@/lib/meal-types";

import { ensureBackendEnabled } from "@/server/api/guard";

import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";

import { fetchPublishedMenuEntry } from "@/server/repositories/menus";



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

  const dateKey = searchParams.get("dateKey");

  const mealType = searchParams.get("mealType");



  if (!dateKey || !mealType) {

    return jsonError("dateKey i mealType su obavezni.", 400);

  }



  if (!["breakfast", "lunch", "dinner"].includes(mealType)) {

    return jsonError("Neispravan mealType.", 400);

  }



  const published = await fetchPublishedMenuEntry(dateKey, mealType as MealType);

  return jsonOk(published);

}

