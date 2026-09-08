import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import {
  deleteIngredientDb,
  deleteReportDb,
  fetchMagacinState,
  upsertIngredientDb,
  upsertReportDb,
} from "@/server/repositories/magacin";

const ingredientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  ingredientType: z.enum(["main", "overhead"]).optional().default("main"),
  currentStock: z.number().nonnegative(),
  minStock: z.number().nonnegative(),
});

const reportItemSchema = z.object({
  ingredientId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.enum(["kg", "g", "l", "kom", "pak"]),
  amountRsd: z.number().nonnegative(),
});

const reportSchema = z.object({
  id: z.string().optional(),
  dateKey: z.string().min(1),
  label: z.string().min(1),
  supplier: z.string().optional(),
  status: z.enum(["draft", "finalized"]),
  totalRsd: z.number().nonnegative(),
  createdBy: z.string().min(1),
  finalizedAt: z.string().optional(),
  items: z.array(reportItemSchema),
});

const bodySchema = z.union([
  z.object({ kind: z.literal("ingredient"), ingredient: ingredientSchema }),
  z.object({ kind: z.literal("report"), report: reportSchema }),
]);

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
    const state = await fetchMagacinState();
    return jsonOk(state);
  } catch (error) {
    console.error("[magacin GET]", error);
    return jsonError("Greška pri učitavanju magacina i izveštaja nabavke.", 500);
  }
}

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenModerator();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = bodySchema.parse(await request.json());

    if (body.kind === "ingredient") {
      const state = await upsertIngredientDb(body.ingredient);
      return jsonOk({ state }, 201);
    }

    const state = await upsertReportDb(body.report);
    return jsonOk({ state }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return jsonError(message, 400);
  }
}

export async function DELETE(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenModerator();
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id || !type) {
    return jsonError("Missing id or type", 400);
  }

  try {
    const state =
      type === "ingredient"
        ? await deleteIngredientDb(id)
        : await deleteReportDb(id);
    return jsonOk(state);
  } catch (error) {
    console.error("[magacin DELETE]", error);
    return jsonError("Greška pri brisanju.", 500);
  }
}
