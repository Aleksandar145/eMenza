import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { fetchActivityLogsDb } from "@/server/repositories/activity-logs";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireRole(["admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const actionTypes = searchParams.getAll("actionTypes[]");
    const result = await fetchActivityLogsDb({
      actionTypes: actionTypes.length > 0 ? actionTypes : undefined,
      actionType: searchParams.get("actionType") || undefined,
      role: searchParams.get("role") || undefined,
      userId: searchParams.get("userId") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch logs", 500);
  }
}
