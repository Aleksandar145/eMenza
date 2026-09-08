import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenStaff } from "@/server/auth/session";
import { consumeTokenDb } from "@/server/repositories/ezeton";

const bodySchema = z.object({
  profileId: z.string().uuid(),
  mealName: z.string().optional().nullable(),
  mealSlot: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenStaff();
  if ("error" in auth) {
    return auth.error;
  }

  let body;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev.", 400);
  }

  try {
    const token = await consumeTokenDb(body.profileId, body.mealName, body.mealSlot);
    if (!token) {
      return jsonError("Student nema aktivan žeton.", 404);
    }
    return jsonOk({ token });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Potrošnja žetona nije uspela.", 400);
  }
}
