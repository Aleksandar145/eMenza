import { isAuthEnabled } from "@/server/env";
import { jsonError } from "@/server/auth/session";

export function ensureBackendEnabled() {
  if (!isAuthEnabled()) {
    return jsonError("Backend nije konfigurisan. Dodaj Supabase env varijable.", 503);
  }
  return null;
}
