import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import { markAppliedDate } from "@/server/repositories/magacin-recipe";

const bodySchema = z.object({
  dateKey: z.string().min(1),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireKitchenModerator();
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const state = await markAppliedDate(body.dateKey);
    return jsonOk({ state }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apply failed";
    return jsonError(message, 400);
  }
}
