import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { fetchJelovnikState } from "@/server/repositories/menus";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const fromDateKey = searchParams.get("from") ?? undefined;
  const toDateKey = searchParams.get("to") ?? undefined;

  try {
    const state = await fetchJelovnikState(
      fromDateKey || toDateKey ? { fromDateKey, toDateKey } : undefined,
    );
    return jsonOk(state);
  } catch (error) {
    console.error("[admin/menus GET]", error);
    return jsonError("Greška pri učitavanju menija.", 500);
  }
}
