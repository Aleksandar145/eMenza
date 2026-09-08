import { apiFetch } from "@/lib/api/client";
import type { FetchActivityLogsResult } from "@/server/repositories/activity-logs";

export async function fetchActivityLogs(params?: {
  actionTypes?: string[];
  actionType?: string;
  role?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<FetchActivityLogsResult> {
  const qs = buildLogQueryString(params);
  return apiFetch<FetchActivityLogsResult>(`/api/admin/logs${qs ? `?${qs}` : ""}`);
}

/** Kuhinja/moderator dnevnik — isti skup parametara, drugi (moderator-guarded) endpoint. */
export async function fetchKitchenActivityLogs(params?: {
  actionTypes?: string[];
  actionType?: string;
  role?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<FetchActivityLogsResult> {
  const qs = buildLogQueryString(params);
  return apiFetch<FetchActivityLogsResult>(`/api/kitchen/logs${qs ? `?${qs}` : ""}`);
}

function buildLogQueryString(params?: {
  actionTypes?: string[];
  actionType?: string;
  role?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params?.actionTypes?.length) {
    for (const at of params.actionTypes) {
      if (at) searchParams.append("actionTypes[]", at);
    }
  } else if (params?.actionType) {
    searchParams.set("actionType", params.actionType);
  }
  if (params?.role) searchParams.set("role", params.role);
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));

  return searchParams.toString();
}
