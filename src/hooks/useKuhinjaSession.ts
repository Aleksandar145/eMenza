"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import {
  clearKitchenDemoCookie,
  readKitchenDemoCookieFromDocument,
  setKitchenDemoCookie,
} from "@/lib/kuhinja-demo-session";
import { findKuhinjaMockAccount } from "@/lib/kuhinja-mock";
import {
  findKitchenEmployeeByCredentials,
  getKitchenEmployeeByEmail,
  hydrateKitchenStaffFromStorage,
  resolveKitchenStaffRole,
} from "@/lib/kuhinja-staff-store";
import type { KitchenStaffRole } from "@/lib/kuhinja-roles";
import { normalizeKitchenStaffRole } from "@/lib/kuhinja-roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  applyAdminSystemState,
  hydrateAdminSystemFromStorage,
  setStaffLastLoginAt,
  setStaffLastLogoutAt,
} from "@/lib/admin-system-store";
import { fetchAdminFromApi, upsertStaffListToApi } from "@/lib/backend/admin-api";

export const KUHINJA_SESSION_STORAGE_KEY = "emenza-kuhinja-session";

function resolveServerKitchenRole(
  email: string,
  serverRole: string | null | undefined,
): KitchenStaffRole {
  if (serverRole === "kuvar" || serverRole === "salter" || serverRole === "moderator") {
    return serverRole;
  }
  return resolveKitchenStaffRole(email, normalizeKitchenStaffRole(serverRole));
}

export type KuhinjaSession = {
  email: string;
  displayName: string;
  role: KitchenStaffRole;
  loggedInAt: string;
  mustChangePassword?: boolean;
};

function parseStoredSession(raw: string): KuhinjaSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<KuhinjaSession>;
    if (!parsed.email || !parsed.displayName || !parsed.loggedInAt) {
      return null;
    }

    return syncDemoSessionRole({
      email: parsed.email,
      displayName: parsed.displayName,
      role: normalizeKitchenStaffRole(parsed.role),
      loggedInAt: parsed.loggedInAt,
    });
  } catch {
    return null;
  }
}

function loadCachedSession(): KuhinjaSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(KUHINJA_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  return parseStoredSession(raw);
}

function persistCachedSession(session: KuhinjaSession, setCookie: boolean) {
  sessionStorage.setItem(KUHINJA_SESSION_STORAGE_KEY, JSON.stringify(session));
  if (setCookie) {
    setKitchenDemoCookie(session);
  } else {
    clearKitchenDemoCookie();
  }
}

function clearCachedSession() {
  sessionStorage.removeItem(KUHINJA_SESSION_STORAGE_KEY);
  clearKitchenDemoCookie();
}

function syncDemoSessionRole(session: KuhinjaSession): KuhinjaSession {
  const employee = getKitchenEmployeeByEmail(session.email);

  return {
    ...session,
    displayName: employee?.displayName ?? session.displayName,
    role: resolveKitchenStaffRole(session.email, session.role),
  };
}

function loadDemoSession(): KuhinjaSession | null {
  const fromStorage = loadCachedSession();
  const fromCookie = readKitchenDemoCookieFromDocument();
  const session = fromStorage ?? fromCookie;

  if (!session) {
    return null;
  }

  return syncDemoSessionRole(session);
}

export function useKuhinjaSession() {
  const backend = isClientBackendEnabled();
  const [session, setSession] = useState<KuhinjaSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function hydrate() {
      hydrateAdminSystemFromStorage();
      hydrateKitchenStaffFromStorage();

      if (!backend) {
        const demoSession = loadDemoSession();
        if (demoSession) {
          persistCachedSession(demoSession, true);
          setSession(demoSession);
        }
        setIsReady(true);
        return;
      }

      const cachedSession = loadCachedSession();
      if (cachedSession) {
        setSession(syncDemoSessionRole(cachedSession));
      }
      setIsReady(true);

      try {
        const data = await apiGet<{
          profile: { email: string; displayName: string; role: string } | null;
        }>("/api/auth/staff/session");

        if (data.profile?.role === "kitchen") {
          const profileRole = (data.profile as { kitchenRole?: string }).kitchenRole;
          const nextSession: KuhinjaSession = {
            email: data.profile.email,
            displayName: data.profile.displayName,
            role: resolveServerKitchenRole(
              data.profile.email,
              cachedSession?.email === data.profile.email
                ? profileRole ?? normalizeKitchenStaffRole(data.profile.role)
                : profileRole ?? normalizeKitchenStaffRole(data.profile.role),
            ),
            loggedInAt: cachedSession?.loggedInAt ?? new Date().toISOString(),
          };
          persistCachedSession(nextSession, false);
          setSession(nextSession);
          return;
        }

        const demoSession = loadDemoSession();
        if (demoSession) {
          persistCachedSession(demoSession, true);
          setSession(demoSession);
          return;
        }

        if (cachedSession) {
          clearCachedSession();
        }

        clearKitchenDemoCookie();
        setSession(null);
      } catch {
        if (!cachedSession) {
          const demoSession = loadDemoSession();
          if (demoSession) {
            persistCachedSession(demoSession, true);
            setSession(demoSession);
          } else {
            setSession(null);
          }
        }
      }
    }

    void hydrate();
  }, [backend]);

  const login = useCallback(
    async (email: string, password: string): Promise<KuhinjaSession | false> => {
      if (backend) {
        try {
          const data = await apiPost<{ session?: KuhinjaSession; suspended?: boolean; displayName?: string; suspendedReason?: string }>("/api/auth/staff/login", {
            email,
            password,
            role: "kitchen",
          });
          if (data.suspended) {
            throw { suspended: true, displayName: data.displayName ?? email, suspendedReason: data.suspendedReason };
          }
          if (data.session) {
            const serverRole = data.session.role as string;
            const serverKitchenRole = (data.session as { kitchenRole?: string }).kitchenRole;
            const nextSession = {
              ...data.session,
              role: resolveServerKitchenRole(
                data.session.email,
                serverKitchenRole ?? serverRole,
              ),
            };
            setStaffLastLoginAt(email, data.session.loggedInAt);
            persistCachedSession(nextSession, false);
            setSession(nextSession);
            return nextSession;
          }
        } catch (err: unknown) {
          if (err && typeof err === "object" && "suspended" in err) {
            throw err;
          }
          // API failed — fall through to mock checks
        }
      }

      const mockAccount = findKuhinjaMockAccount(email, password);
      if (mockAccount) {
        setStaffLastLoginAt(email, new Date().toISOString());
        const nextSession = syncDemoSessionRole({
          email: mockAccount.email,
          displayName: mockAccount.displayName,
          role: mockAccount.role,
          loggedInAt: new Date().toISOString(),
        });
        persistCachedSession(nextSession, true);
        setSession(nextSession);
        return nextSession;
      }

      const kitchenEmployee = findKitchenEmployeeByCredentials(email, password);
      if (kitchenEmployee) {
        setStaffLastLoginAt(email, new Date().toISOString());
        const nextSession: KuhinjaSession = {
          email: kitchenEmployee.email,
          displayName: kitchenEmployee.displayName,
          role: kitchenEmployee.role,
          loggedInAt: new Date().toISOString(),
        };
        persistCachedSession(nextSession, true);
        setSession(nextSession);
        return nextSession;
      }

      return false;
    },
    [backend],
  );

  const logout = useCallback(async () => {
    const email = session?.email;

    if (backend && email) {
      const supabase = createSupabaseBrowserClient();
      try {
        await fetch("/api/auth/staff/session", { method: "DELETE" });
      } catch {
        // Network/server error, still proceed with local cleanup
      }

      // Directly upsert staff lastLogoutAt via the admin API so the server always
      // has the correct data — regardless of whether the DELETE handler succeeded.
      try {
        // Fetch current staff from server, update lastLogoutAt, push back
        const state = await fetchAdminFromApi("public");
        const staffWithLogout = state.staff.map((s) =>
          s.email.toLowerCase() === email.toLowerCase()
            ? { ...s, lastLogoutAt: new Date().toISOString() }
            : s,
        );
        await upsertStaffListToApi(staffWithLogout);
      } catch {
        // Non-critical — the DELETE handler already tried
      }

      // Fetch fresh server state and apply locally so this tab + the admin tab
      // see the correct status immediately.
      try {
        const fresh = await fetchAdminFromApi("public");
        if (fresh) applyAdminSystemState(fresh);
      } catch {
        // Non-critical — fall back to setStaffLastLogoutAt
      }

      try {
        await supabase?.auth.signOut();
      } catch {
        // Ignore client-side signout errors
      }
    }

    clearCachedSession();
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
