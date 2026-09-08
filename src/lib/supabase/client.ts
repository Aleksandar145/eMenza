import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isAuthEnabled } from "@/server/env";

export function createSupabaseBrowserClient() {
  if (!isAuthEnabled()) {
    return null;
  }

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
