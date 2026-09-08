import type { DishCatalogState } from "@/lib/dish-catalog-mock";
import type { AdminSystemState, StaffMember } from "@/lib/admin-system-mock";
import { apiDelete, apiFetch, apiGetData, apiPatch, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

const DISHES_API_TIMEOUT_MS =
  typeof process !== "undefined" && process.env.NODE_ENV === "development" ? 90_000 : 60_000;

let inFlightDishes: Promise<DishCatalogState> | null = null;

export function resetInFlightDishes() {
  inFlightDishes = null;
}

export async function fetchDishesFromApi(): Promise<DishCatalogState> {
  if (inFlightDishes) {
    return inFlightDishes;
  }

  inFlightDishes = apiFetch<DishCatalogState>("/api/dishes", undefined, DISHES_API_TIMEOUT_MS).finally(
    () => {
      inFlightDishes = null;
    },
  );

  return inFlightDishes;
}

export async function saveDishToApi(dish: Record<string, unknown>): Promise<DishCatalogState> {
  const result = await apiPost<{ state?: DishCatalogState; dish?: unknown }>("/api/dishes", dish);
  if (result.state) {
    return result.state;
  }
  return fetchDishesFromApi();
}

export type AdminApiScope = "public" | "full";

export async function fetchAdminFromApi(scope: AdminApiScope = "public"): Promise<AdminSystemState> {
  const query = scope === "full" ? "?scope=full" : "";
  return apiGetData<AdminSystemState>(`/api/admin${query}`);
}

export async function patchAdminFromApi(partial: Partial<AdminSystemState>): Promise<AdminSystemState> {
  return apiPatch<AdminSystemState>("/api/admin", { partial });
}

export async function publishNoticeToApi(input: {
  title: string;
  message: string;
  priority: string;
  targets: string[];
  targetEmail?: string;
  displayMode: string;
  authorName?: string;
  authorEmail?: string;
}): Promise<{ notice: object }> {
  return apiPost<{ notice: object }>("/api/admin/notices", input);
}

export async function archiveNoticeFromApi(idOrIds: string | string[]): Promise<void> {
  const ids = typeof idOrIds === "string" ? [idOrIds] : idOrIds;
  await apiPatch<{ archived: boolean }>("/api/admin/notices", { action: "archive", ids });
}

export async function submitFeedbackViaApi(input: {
  name: string;
  message: string;
  rating: number;
  anonymous?: boolean;
  initials?: string;
}): Promise<AdminSystemState> {
  const result = await apiPost<{ state: AdminSystemState }>("/api/admin", input);
  return result.state;
}

export async function deleteFeedbackEntryFromApi(id: string): Promise<void> {
  await apiDelete(`/api/admin/feedback/${encodeURIComponent(id)}`);
}

export async function toggleFeedbackHelpfulFromApi(id: string, add: boolean): Promise<void> {
  await apiPatch(`/api/admin/feedback/${encodeURIComponent(id)}`, { action: "toggle-helpful", add });
}

export async function toggleFeedbackDisagreeFromApi(id: string, add: boolean): Promise<void> {
  await apiPatch(`/api/admin/feedback/${encodeURIComponent(id)}`, { action: "toggle-disagree", add });
}

export async function markFeedbackReviewedFromApi(id: string, reply?: string): Promise<void> {
  await apiPatch(`/api/admin/feedback/${encodeURIComponent(id)}`, { action: "mark-reviewed", reply });
}

export async function clearFeedbackReplyFromApi(id: string): Promise<void> {
  await apiPatch(`/api/admin/feedback/${encodeURIComponent(id)}`, { action: "clear-reply" });
}

export async function inviteStaffToApi(input: {
  email: string;
  displayName: string;
  role: string;
  kitchenRole?: string;
  password?: string;
}): Promise<{ supabaseUserId: string; password: string }> {
  return apiPost<{ supabaseUserId: string; password: string }>("/api/admin/staff/invite", input);
}

export async function deleteStaffFromApi(supabaseUserId: string): Promise<void> {
  await apiPost("/api/admin/staff/delete", { supabaseUserId });
}

export async function updateStaffRoleViaApi(supabaseUserId: string, role: string): Promise<void> {
  await apiPost("/api/admin/staff/update-role", { supabaseUserId, role });
}

export async function resetStaffPasswordViaApi(supabaseUserId: string, password: string): Promise<void> {
  await apiPost("/api/admin/staff/reset-password", { supabaseUserId, password });
}

export async function upsertStaffListToApi(staff: StaffMember[]): Promise<StaffMember[]> {
  const result = await apiPost<{ staff: StaffMember[] }>("/api/admin/staff/upsert", { staff });
  return result.staff;
}

export async function markNoticeReadViaApi(noticeId: string): Promise<void> {
  await apiPost("/api/admin/notices/read", { noticeId });
}

export async function getNoticeReadCountViaApi(noticeId: string): Promise<number> {
  const data = await apiGetData<{ count: number }>(`/api/admin/notices/read?noticeId=${encodeURIComponent(noticeId)}`);
  return data.count;
}

export async function getNoticeReadCountsViaApi(noticeIds: string[]): Promise<Record<string, number>> {
  const results = await Promise.allSettled(
    noticeIds.map(async (id) => {
      const count = await getNoticeReadCountViaApi(id);
      return { id, count } as const;
    }),
  );
  const map: Record<string, number> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      map[result.value.id] = result.value.count;
    }
  }
  return map;
}

export function shouldUseAdminApi() {
  return isClientBackendEnabled();
}

export function shouldUseDishesApi() {
  return isClientBackendEnabled();
}
