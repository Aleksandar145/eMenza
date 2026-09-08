import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/server/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (!adminClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey();
    adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}
