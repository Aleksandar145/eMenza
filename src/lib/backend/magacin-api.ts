import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import type { Ingredient, MagacinState, ProcurementReport } from "@/lib/magacin-mock";

export function shouldUseMagacinApi() {
  return isClientBackendEnabled();
}

type UpsertIngredientInput = {
  id?: string;
  name: string;
  category: Ingredient["category"];
  unit: Ingredient["unit"];
  ingredientType: Ingredient["ingredientType"];
  currentStock: number;
  minStock: number;
};

type UpsertReportInput = {
  id?: string;
  dateKey: string;
  label: string;
  supplier?: string;
  status: "draft" | "finalized";
  totalRsd: number;
  createdBy: string;
  finalizedAt?: string;
  items: ProcurementReport["items"];
};

export async function fetchMagacinFromApi(): Promise<MagacinState> {
  return apiGet<MagacinState>("/api/magacin");
}

export async function upsertIngredientViaApi(
  input: UpsertIngredientInput,
): Promise<MagacinState> {
  const result = await apiPost<{ state: MagacinState }>("/api/magacin", {
    kind: "ingredient",
    ingredient: input,
  });
  return result.state;
}

export async function upsertReportViaApi(
  input: UpsertReportInput,
): Promise<MagacinState> {
  const result = await apiPost<{ state: MagacinState }>("/api/magacin", {
    kind: "report",
    report: input,
  });
  return result.state;
}

export async function deleteMagacinViaApi(
  type: "ingredient" | "report",
  id: string,
): Promise<MagacinState> {
  return apiDelete<MagacinState>(
    `/api/magacin?id=${encodeURIComponent(id)}&type=${type}`,
  );
}
