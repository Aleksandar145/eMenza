"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_MOCK_CREDENTIALS } from "@/lib/admin-system-mock";
import {
  hydrateAdminSystemFromStorage,
  setStaffLastLoginAt,
  setStaffLastLogoutAt,
} from "@/lib/admin-system-store";
import { apiGet, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const ADMIN_SESSION_STORAGE_KEY = "emenza-admin-session";

export type AdminSession = {
  email: string;
  displayName: string;
  loggedInAt: string;
  mustChangePassword?: boolean;
};

function loadMockSession(): AdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export function useAdminSession() {
  const backend = isClientBackendEnabled();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  function persistAdminSession(s: AdminSession) {
    sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(s));
  }

  useEffect(() => {
    async function hydrate() {
      hydrateAdminSystemFromStorage();

      if (!backend) {
        setSession(loadMockSession());
        setIsReady(true);
        return;
      }

      const cached = loadMockSession();
      if (cached) {
        setSession(cached);
      }

      try {
        const data = await apiGet<{
          profile: { email: string; displayName: string; role: string } | null;
        }>("/api/auth/staff/session");

        if (data.profile?.role === "admin") {
          const next: AdminSession = {
            email: data.profile.email,
            displayName: data.profile.displayName,
            loggedInAt: new Date().toISOString(),
          };
          persistAdminSession(next);
          setSession(next);
        } else if (data.profile && data.profile.role !== "admin") {
          sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
          setSession(null);
        }
      } catch {
        // API unavailable — cached session (if any) already set above
      } finally {
        setIsReady(true);
      }
    }

    hydrate();
  }, [backend]);

  const login = useCallback(
    async (email: string, password: string): Promise<AdminSession | false> => {
      if (backend) {
        try {
          const data = await apiPost<{ session: AdminSession }>("/api/auth/staff/login", {
            email,
            password,
            role: "admin",
          });
          setStaffLastLoginAt(email, data.session.loggedInAt);
          persistAdminSession(data.session);
          setSession(data.session);
          return data.session;
        } catch {
          // API failed — fall through to mock checks
        }
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (
        normalizedEmail === ADMIN_MOCK_CREDENTIALS.email &&
        password === ADMIN_MOCK_CREDENTIALS.password
      ) {
        setStaffLastLoginAt(normalizedEmail, new Date().toISOString());
        const nextSession: AdminSession = {
          email: ADMIN_MOCK_CREDENTIALS.email,
          displayName: ADMIN_MOCK_CREDENTIALS.displayName,
          loggedInAt: new Date().toISOString(),
        };
        sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
        return nextSession;
      }

      return false;
    },
    [backend],
  );

  const logout = useCallback(async () => {
    const email = session?.email;
    if (backend) {
      const supabase = createSupabaseBrowserClient();
      await fetch("/api/auth/staff/session", { method: "DELETE" });
      await supabase?.auth.signOut();
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
    setSession(null);
    if (email) setStaffLastLogoutAt(email);
  }, [backend, session?.email]);

  return {
    session,
    isReady,
    isAuthenticated: Boolean(session),
    login,
    logout,
  };
}
