import { isAuthEnabled, isBackendEnabled } from "@/server/env";

export function isClientBackendEnabled() {
  return isAuthEnabled();
}

export function useBackendMode() {
  return isClientBackendEnabled();
}

/** Server-side check including DATABASE_URL */
export { isBackendEnabled };
