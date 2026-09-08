"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchUserSettingsFromApi,
  saveUserSettingsViaApi,
  shouldUseSettingsApi,
} from "@/lib/backend/settings-api";
import { ACCOUNT_REGISTERED_AT_PLACEHOLDER, buildAccountInfo } from "@/lib/account-info";
import { writeAppSettingsBackup } from "@/lib/app-preferences";
import {
  cloneSettingsState,
  createEmptySettingsState,
  initialSettingsState,
  type SettingsState,
} from "@/lib/podesavanja-mock";
import { loadUserSettings, saveUserSettings } from "@/lib/user-settings-store";
import {
  readUserSettingsCache,
  writeUserSettingsCache,
} from "@/lib/user-settings-cache";
import {
  useStudentSessionContext,
  type StudentSession,
} from "@/contexts/StudentSessionProvider";
import { resolveStudentProfileKind } from "@/lib/student-profile";

function resolveInitialSettings(backend: boolean) {
  if (backend) {
    return createEmptySettingsState();
  }
  return cloneSettingsState(initialSettingsState);
}

function mergeSessionIntoSettings(settings: SettingsState, session: StudentSession): SettingsState {
  const studentKind = resolveStudentProfileKind({
    studentKind: settings.profile.studentKind ?? session.studentKind,
    indexNumber: settings.profile.generation || session.indexNumber,
    generation: settings.profile.generation,
  });

  const registeredAt =
    settings.account.registeredAt !== ACCOUNT_REGISTERED_AT_PLACEHOLDER
      ? settings.account.registeredAt
      : ACCOUNT_REGISTERED_AT_PLACEHOLDER;

  return {
    ...settings,
    profile: {
      ...settings.profile,
      email: session.email || settings.profile.email,
      firstName: settings.profile.firstName || session.firstName || "",
      lastName: settings.profile.lastName || session.lastName || "",
      faculty: settings.profile.faculty || session.faculty || "",
      studentKind,
      generation:
        settings.profile.generation ||
        (studentKind === "student" ? session.indexNumber || "" : ""),
    },
    account: {
      ...buildAccountInfo({ studentKind }),
      registeredAt,
      registrationOnboardingCompleted: settings.account.registrationOnboardingCompleted,
    },
  };
}

type UserSettingsContextValue = {
  settings: SettingsState;
  isLoaded: boolean;
  isRemoteHydrated: boolean;
  persistSettings: (next: SettingsState) => void;
  refreshProfile: () => void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const backend = shouldUseSettingsApi();
  const { isAuthenticated, isDemo, isReady: sessionReady, session, isLoggingOut } =
    useStudentSessionContext();
  const useRemote = backend && isAuthenticated && !isDemo;

  const [settings, setSettings] = useState<SettingsState>(() => resolveInitialSettings(backend));
  const [isLoaded, setIsLoaded] = useState(() => !backend);
  const [isRemoteHydrated, setIsRemoteHydrated] = useState(() => !backend);
  const remoteHydratedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!backend) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(loadUserSettings());
      setIsLoaded(true);
      setIsRemoteHydrated(true);
      return;
    }

    if (!sessionReady) {
      return;
    }

    if (isLoggingOut) {
      setSettings(createEmptySettingsState());
      setIsLoaded(true);
      setIsRemoteHydrated(true);
      remoteHydratedUserIdRef.current = null;
      return;
    }

    if (!isAuthenticated || isDemo) {
      setSettings(isDemo ? loadUserSettings() : createEmptySettingsState());
      setIsLoaded(true);
      setIsRemoteHydrated(true);
      remoteHydratedUserIdRef.current = null;
      return;
    }

    if (!session) {
      setSettings(createEmptySettingsState());
      setIsLoaded(true);
      setIsRemoteHydrated(true);
      remoteHydratedUserIdRef.current = null;
      return;
    }

    const userId = session.userId;
    const cached = readUserSettingsCache(userId);
    const seeded = mergeSessionIntoSettings(cached ?? createEmptySettingsState(), session);
    setSettings(seeded);
    setIsLoaded(true);

    if (remoteHydratedUserIdRef.current === userId) {
      setIsRemoteHydrated(true);
      return;
    }

    setIsRemoteHydrated(false);

    const activeSession = session;
    let cancelled = false;

    async function hydrate() {
      try {
        const remote = await fetchUserSettingsFromApi();
        if (!cancelled) {
          const merged = mergeSessionIntoSettings(remote, activeSession);
          setSettings(merged);
          writeUserSettingsCache(userId, merged);
          writeAppSettingsBackup(userId, merged.app);
          remoteHydratedUserIdRef.current = userId;
          setIsRemoteHydrated(true);
        }
      } catch {
        if (!cancelled) {
          setSettings((current) => mergeSessionIntoSettings(current, activeSession));
          setIsRemoteHydrated(true);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, isAuthenticated, isDemo, isLoggingOut, session?.userId, sessionReady]);

  const refreshProfile = useCallback(() => {
    if (!useRemote || !session) {
      return;
    }

    const activeSession = session;
    void (async () => {
      try {
        const remote = await fetchUserSettingsFromApi();
        const merged = mergeSessionIntoSettings(remote, activeSession);
        setSettings(merged);
        if (activeSession.userId) {
          writeUserSettingsCache(activeSession.userId, merged);
          writeAppSettingsBackup(activeSession.userId, merged.app);
        }
      } catch {
        setSettings((current) => mergeSessionIntoSettings(current, activeSession));
      }
    })();
  }, [session, useRemote]);

  useEffect(() => {
    if (!useRemote || !session?.userId) {
      return;
    }

    const refresh = refreshProfile;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    function handleWindowFocus() {
      refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refreshProfile, session?.userId, useRemote]);

  const persistSettings = useCallback(
    (next: SettingsState) => {
      setSettings(next);

      if (useRemote) {
        if (session?.userId) {
          writeUserSettingsCache(session.userId, next);
          writeAppSettingsBackup(session.userId, next.app);
        }

        void (async () => {
          try {
            const saved = await saveUserSettingsViaApi(next);
            if (!session) {
              return;
            }

            const merged = mergeSessionIntoSettings(saved, session);
            setSettings(merged);

            if (session.userId) {
              writeUserSettingsCache(session.userId, merged);
              writeAppSettingsBackup(session.userId, merged.app);
            }

            saveUserSettings(merged);
          } catch {
            saveUserSettings(next);
          }
        })();
        return;
      }

      saveUserSettings(next);
    },
    [session, useRemote],
  );

  const value = useMemo(
    () => ({
      settings,
      isLoaded,
      isRemoteHydrated,
      persistSettings,
      refreshProfile,
    }),
    [isLoaded, isRemoteHydrated, persistSettings, refreshProfile, settings],
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettingsContext() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  }
  return context;
}
