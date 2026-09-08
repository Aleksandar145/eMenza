import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import { fetchActivityLogsDb } from "@/server/repositories/activity-logs";

// Radnje relevantne za kuhinju (spiskovi, jela, suspenzije/aktivacije naloga,
// obaveštenja) — moderator vidi samo ove u svom dnevniku.
const KITCHEN_ACTION_TYPES = [
  "staff.create",
  "staff.role_change",
  "staff.suspend",
  "staff.reactivate",
  "staff.delete",
  "menu.slot.update",
  "menu.slot.toggle",
  "menu.stock",
  "menu.publish.toggle",
  "menu.copy",
  "menu.schedule.publish",
  "dish.upsert",
  "dish.delete",
  "notice.publish",
  "notice.archive",
];

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenModerator();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedTypes = searchParams.getAll("actionTypes[]");

    // Presek traženih i kuhinji-relevantnih tipova; ako ništa nije traženo, svi relevantni.
    const selected = requestedTypes.length > 0
      ? requestedTypes.filter((t) => KITCHEN_ACTION_TYPES.includes(t))
      : KITCHEN_ACTION_TYPES;

    const result = await fetchActivityLogsDb({
      actionTypes: selected.length > 0 ? selected : undefined,
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
