import type { SettingsState } from "@/lib/podesavanja-mock";
import { apiGetData, apiPatch } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

export function shouldUseSettingsApi() {
  return isClientBackendEnabled();
}

export async function fetchUserSettingsFromApi() {
  const data = await apiGetData<{ settings: SettingsState }>("/api/settings");
  return data.settings;
}

export async function saveUserSettingsViaApi(settings: SettingsState) {
  const data = await apiPatch<{ settings: SettingsState }>("/api/settings", { settings });
  return data.settings;
}
