import type { KitchenStaffProfile } from "@/app/api/kitchen/staff/route";
import { apiGetData, apiPatch } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

export function shouldUseKitchenStaffApi() {
  return isClientBackendEnabled();
}

export async function fetchKitchenStaffFromApi(): Promise<KitchenStaffProfile[]> {
  const data = await apiGetData<{ staff: KitchenStaffProfile[] }>("/api/kitchen/staff");
  return data.staff;
}

export async function updateKitchenStaffRoleFromApi(
  userId: string,
  role: "kuvar" | "salter",
): Promise<void> {
  await apiPatch("/api/kitchen/staff/role", { userId, role });
}

export async function updateKitchenStaffStatusFromApi(
  userId: string,
  active: boolean,
  reason?: string,
): Promise<void> {
  await apiPatch("/api/kitchen/staff/status", { userId, active, reason });
}
