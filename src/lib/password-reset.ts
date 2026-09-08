import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const PASSWORD_RESET_NEXT_PATH = "/auth/reset-password";

export function buildPasswordResetRedirectUrl(origin: string) {
  const next = encodeURIComponent(PASSWORD_RESET_NEXT_PATH);
  return `${origin}/auth/callback?next=${next}`;
}

export async function requestPasswordResetEmail(email: string, origin?: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Auth nije dostupan.");
  }

  const resolvedOrigin =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");

  if (!resolvedOrigin) {
    throw new Error("Origin nije dostupan.");
  }

  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: buildPasswordResetRedirectUrl(resolvedOrigin),
  });
}
