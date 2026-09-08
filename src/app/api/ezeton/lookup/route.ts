import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getProfileByUserId, jsonError, jsonOk, requireKitchenStaff } from "@/server/auth/session";
import { getTokenByCodeDb } from "@/server/repositories/ezeton";

const querySchema = z.object({
  code: z.string(),
});

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenStaff();
  if ("error" in auth) {
    return auth.error;
  }

  const url = new URL(request.url);
  const { code } = querySchema.parse(Object.fromEntries(url.searchParams));
  const cleanCode = code.replace(/^emenza-zeton:/i, "").toUpperCase();

  const token = await getTokenByCodeDb(cleanCode);
  if (!token) {
    return jsonError("Žeton nije pronađen.", 404);
  }

  const profile = await getProfileByUserId(token.profileId);
  const studentName = profile?.displayName ?? "Nepoznat student";

  return jsonOk({ token, studentName });
}
