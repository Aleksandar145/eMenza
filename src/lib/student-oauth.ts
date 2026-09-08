import { isClerkEnabledClient } from "@/lib/clerk-config";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type StudentOAuthProvider = "google" | "apple";

export function isStudentOAuthConfigured() {
  if (isClerkEnabledClient()) {
    return true;
  }

  return isClientBackendEnabled();
}

export function isClerkGoogleOAuthConfigured() {
  return isClerkEnabledClient();
}

export async function signInWithStudentOAuth(provider: StudentOAuthProvider) {
  if (isClerkEnabledClient()) {
    throw new Error(`${provider === "google" ? "Google" : "Apple"} ide preko dugmeta iznad (Clerk).`);
  }

  if (!isClientBackendEnabled()) {
    throw new Error("OAuth zahteva aktivnu Supabase konfiguraciju i podešavanje provajdera.");
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Auth nije dostupan.");
  }

  const redirectTo = `${window.location.origin}/auth/callback?next=/register`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams:
        provider === "google"
          ? { prompt: "select_account" }
          : undefined,
    },
  });

  if (error) {
    throw error;
  }
}
