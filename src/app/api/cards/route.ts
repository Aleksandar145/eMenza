import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonOk, requireRole } from "@/server/auth/session";
import { fetchReferentCardsState } from "@/server/repositories/cards";

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireRole(["referent", "admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  const state = await fetchReferentCardsState();
  return jsonOk(state);
}
