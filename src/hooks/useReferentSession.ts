"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hydrateAdminSystemFromStorage,
  setStaffLastLoginAt,
  setStaffLastLogoutAt,
} from "@/lib/admin-system-store";
import { apiGet, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { REFERENT_MOCK_CREDENTIALS } from "@/lib/referent-cards-mock";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const REFERENT_SESSION_STORAGE_KEY = "emenza-referent-session";

export type ReferentSession = {
  email: string;
  displayName: string;
  loggedInAt: string;
  mustChangePassword?: boolean;
};

function loadCachedSession(): ReferentSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(REFERENT_SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReferentSession) : null;
  } catch {
    return null;
  }
}

function persistCachedSession(session: ReferentSession) {
  sessionStorage.setItem(REFERENT_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearCachedSession() {
  sessionStorage.removeItem(REFERENT_SESSION_STORAGE_KEY);
}

export function useReferentSession() {
  const backend = isClientBackendEnabled();
  const [session, setSession] = useState<ReferentSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function hydrate() {
      hydrateAdminSystemFromStorage();

      if (!backend) {
        setSession(loadCachedSession());
        setIsReady(true);
        return;
      }

      const cachedSession = loadCachedSession();
      if (cachedSession) {
        setSession(cachedSession);
      }
      setIsReady(true);

      try {
        const data = await apiGet<{
          profile: { email: string; displayName: string; role: string } | null;
        }>("/api/auth/staff/session");

        if (data.profile?.role === "referent") {
          const nextSession: ReferentSession = {
            email: data.profile.email,
            displayName: data.profile.displayName,
            loggedInAt: new Date().toISOString(),
          };
          persistCachedSession(nextSession);
          setSession(nextSession);
        } else if (data.profile && data.profile.role !== "referent") {
          if (cachedSession) {
            clearCachedSession();
          }
          setSession(null);
        }
      } catch {
        if (!cachedSession) {
          setSession(null);
        }
      }
    }

    void hydrate();
  }, [backend]);

  const login = useCallback(
    async (email: string, password: string): Promise<ReferentSession | false> => {
      if (backend) {
        try {
          const data = await apiPost<{ session?: ReferentSession; suspended?: boolean; displayName?: string; suspendedReason?: string }>("/api/auth/staff/login", {
            email,
            password,
            role: "referent",
          });
          if (data.suspended) {
            throw { suspended: true, displayName: data.displayName ?? email, suspendedReason: data.suspendedReason };
          }
          if (data.session) {
            setStaffLastLoginAt(email, data.session.loggedInAt);
            persistCachedSession(data.session);
            setSession(data.session);
            return data.session;
          }
        } catch (err: unknown) {
          if (err && typeof err === "object" && "suspended" in err) {
            throw err; // re-throw suspension info
          }
          // API failed — fall through to mock checks
        }
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (
        normalizedEmail === REFERENT_MOCK_CREDENTIALS.email &&
        password === REFERENT_MOCK_CREDENTIALS.password
      ) {
        setStaffLastLoginAt(normalizedEmail, new Date().toISOString());
        const nextSession: ReferentSession = {
          email: REFERENT_MOCK_CREDENTIALS.email,
          displayName: REFERENT_MOCK_CREDENTIALS.displayName,
          loggedInAt: new Date().toISOString(),
        };
        persistCachedSession(nextSession);
        setSession(nextSession);
        return nextSession;
      }

      return false;
    },
    [backend],
  );

  const logout = useCallback(async () => {
    const email = session?.email;
    clearCachedSession();
    if (backend) {
      const supabase = createSupabaseBrowserClient();
      await fetch("/api/auth/staff/session", { method: "DELETE" });
      await supabase?.auth.signOut();
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
