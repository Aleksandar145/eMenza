"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type StaffSession = {
  email: string;
  displayName: string;
  loggedInAt: string;
};

type StaffRole = "admin" | "referent" | "kitchen";

export function useStaffSession(role: StaffRole) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const backend = isClientBackendEnabled();

  useEffect(() => {
    async function hydrate() {
      if (!backend) {
        setIsReady(true);
        return;
      }

      try {
        const data = await apiGet<{
          profile: { email: string; displayName: string; role: string } | null;
        }>("/api/auth/session");

        if (data.profile?.role === role) {
          setSession({
            email: data.profile.email,
            displayName: data.profile.displayName,
            loggedInAt: new Date().toISOString(),
          });
        }
      } catch {
        setSession(null);
      } finally {
        setIsReady(true);
      }
    }

    hydrate();
  }, [backend, role]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!backend) {
        return false;
      }

      try {
        const data = await apiPost<{ session: StaffSession }>("/api/auth/staff/login", {
          email,
          password,
          role,
        });
        setSession(data.session);
        return true;
      } catch {
        return false;
      }
    },
    [backend, role],
  );

  const logout = useCallback(async () => {
    if (backend) {
      await fetch("/api/auth/session", { method: "DELETE" });
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
    }
    setSession(null);
  }, [backend]);

  return {
    session,
    isReady: backend ? isReady : true,
    isAuthenticated: Boolean(session),
    login,
    logout,
    usesBackend: backend,
  };
}
