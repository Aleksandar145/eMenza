import type {
  SpendingPeriod,
  StudentStatisticsPayload,
  TransactionType,
} from "@/lib/statistika-types";
import { apiGetData } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

export function shouldUseStatisticsApi() {
  return isClientBackendEnabled();
}

export type StatisticsQueryParams = {
  period?: SpendingPeriod;
  anchorDate?: string;
  periodOffset?: number;
  page?: number;
  pageSize?: number;
  types?: TransactionType[];
  from?: string;
  to?: string;
};

function buildStatisticsSearchParams(params: StatisticsQueryParams) {
  const search = new URLSearchParams();

  if (params.period) {
    search.set("period", params.period);
  }
  if (params.anchorDate) {
    search.set("anchorDate", params.anchorDate);
  }
  if (params.periodOffset !== undefined && params.periodOffset !== 0) {
    search.set("periodOffset", String(params.periodOffset));
  }
  if (params.page) {
    search.set("page", String(params.page));
  }
  if (params.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }
  if (params.from) {
    search.set("from", params.from);
  }
  if (params.to) {
    search.set("to", params.to);
  }
  for (const type of params.types ?? []) {
    search.append("type", type);
  }

  return search.toString();
}

export async function fetchStudentStatisticsFromApi(params: StatisticsQueryParams = {}) {
  const query = buildStatisticsSearchParams(params);
  const path = query ? `/api/statistics?${query}` : "/api/statistics";
  return apiGetData<StudentStatisticsPayload>(path);
}

export async function downloadStatisticsCsv(params: StatisticsQueryParams = {}) {
  const search = new URLSearchParams(buildStatisticsSearchParams(params));
  search.set("export", "csv");
  const response = await fetch(`/api/statistics?${search.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "CSV export failed");
  }

  return response.blob();
}

export async function fetchStatisticsExportTransactions(params: StatisticsQueryParams = {}) {
  const search = new URLSearchParams(buildStatisticsSearchParams(params));
  search.set("export", "pdf");
  return apiGetData<{ transactions: StudentStatisticsPayload["transactions"] }>(
    `/api/statistics?${search.toString()}`,
  );
}
