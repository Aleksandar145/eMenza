import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenStaff } from "@/server/auth/session";
import { getTokenByCodeDb, returnTokenDb } from "@/server/repositories/ezeton";

const bodySchema = z.object({
  tokenCode: z.string(),
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
  const code = body.tokenCode.replace(/^emenza-zeton:/i, "").toUpperCase();

  try {
    const tokenByCode = await getTokenByCodeDb(code);
    if (!tokenByCode) {
      return jsonError("Žeton nije pronađen.", 404);
    }

    const token = await returnTokenDb(tokenByCode.profileId);
    if (!token) {
      return jsonError("Žeton nije iskorišćen.", 400);
    }

    return jsonOk({ token });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Vraćanje žetona nije uspelo.", 400);
  }
}
