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
import { apiGetSession, apiPost, ApiError } from "@/lib/api/client";
import { isClerkEnabledClient } from "@/lib/clerk-config";
import { isClientBackendEnabled } from "@/lib/backend-config";
import {
  clearStudentDemoCookie,
  readStudentDemoCookieFromDocument,
  type StudentDemoSession,
} from "@/lib/student-demo-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearUserSettingsCache } from "@/lib/user-settings-cache";
import { clearCachedClerkAvatarUrl } from "@/contexts/ClerkProfileImageContext";
import { clearStudentRemoteCache } from "@/lib/student-remote-cache";
import { markLandingPrefForApply } from "@/lib/app-preferences";
import { parseStudentDisplayName } from "@/lib/student-profile";
import type { RegisterRole } from "@/lib/register-mock";

export const EMAIL_NOT_VERIFIED_MESSAGE =
  "Potvrdite email adresu pre prijave. Proverite inbox i spam folder.";

export type StudentSessionStatus =
  | "loading"
  | "guest"
  | "student"
  | "oauth_pending"
  | "error";

export type OAuthPendingUser = {
  email: string;
  firstName: string;
  lastName: string;
};

export type StudentAuthProvider = "oauth" | "password";

export type StudentSession = {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  userId: string;
  emailConfirmed: boolean;
  authProvider?: StudentAuthProvider;
  canChangePassword?: boolean;
  avatarUrl?: string;
  faculty?: string;
  indexNumber?: string;
  studentKind?: RegisterRole;
};

export type SessionSnapshot = {
  sessionStatus: StudentSessionStatus;
  session: StudentSession | null;
  oauthPendingUser: OAuthPendingUser | null;
  sessionError: string | null;
  isSessionValidated: boolean;
  onboardingPending: boolean;
};

const SESSION_CACHE_KEY = "emenza-student-session-v5";
const SESSION_FETCH_ATTEMPTS = 2;
const SESSION_BOOTSTRAP_MS = 4_000;

let inFlightSessionRequest: Promise<SessionApiResponse> | null = null;

type SessionApiUser = {
  id: string;
  email: string;
  emailConfirmed?: boolean;
  avatarUrl?: string;
  firstName?: string | null;
  lastName?: string | null;
};

type SessionApiProfile = {
  email: string;
  displayName: string;
  role: string;
  faculty?: string | null;
  indexNumber?: string | null;
  studentKind?: RegisterRole;
};

function parseDisplayName(displayName: string) {
  return parseStudentDisplayName(displayName);
}

function buildStudentSession(
  user: SessionApiUser,
  profile: SessionApiProfile,
  options?: {
    authProvider?: StudentAuthProvider;
    canChangePassword?: boolean;
  },
): StudentSession {
  const parsed = parseDisplayName(profile.displayName);
  return {
    userId: user.id,
    email: profile.email,
    displayName: profile.displayName,
    firstName: user.firstName?.trim() || parsed.firstName,
    lastName: user.lastName?.trim() || parsed.lastName,
    emailConfirmed: Boolean(user.emailConfirmed),
    authProvider: options?.authProvider,
    canChangePassword: options?.canChangePassword,
    avatarUrl: user.avatarUrl,
    faculty: profile.faculty?.trim() || undefined,
    indexNumber: profile.indexNumber?.trim() || undefined,
    studentKind: profile.studentKind,
  };
}

function inferOAuthPendingUser(user: SessionApiUser): OAuthPendingUser {
  const email = user.email ?? "";
  return {
    email,
    firstName: user.firstName?.trim() || email.split("@")[0]?.split(".")[0] || "",
    lastName:
      user.lastName?.trim() || email.split("@")[0]?.split(".").slice(1).join(" ") || "",
  };
}

type SessionApiResponse = {
  user: SessionApiUser | null;
  profile: SessionApiProfile | null;
  onboardingPending?: boolean;
  authProvider?: StudentAuthProvider;
  canChangePassword?: boolean;
};

function resolveOnboardingPending(data: SessionApiResponse) {
  return Boolean(data.onboardingPending);
}

function resolveSessionFromApi(
  data: SessionApiResponse,
): Omit<SessionSnapshot, "isSessionValidated"> {
  const onboardingPending = resolveOnboardingPending(data);

  if (data.user && data.profile?.role === "student") {
    const nextSession = buildStudentSession(data.user, data.profile, {
      authProvider: data.authProvider,
      canChangePassword: data.canChangePassword,
    });
    return {
      sessionStatus: "student",
      session: nextSession,
      oauthPendingUser: null,
      sessionError: null,
      onboardingPending,
    };
  }

  if (data.user && !data.profile) {
    return {
      sessionStatus: "oauth_pending",
      session: null,
      oauthPendingUser: inferOAuthPendingUser(data.user),
      sessionError: null,
      onboardingPending: false,
    };
  }

  if (data.user && data.profile) {
    return {
      sessionStatus: "guest",
      session: null,
      oauthPendingUser: null,
      sessionError: "Nalog nije studentski. Obratite se podršci.",
      onboardingPending: false,
    };
  }

  return {
    sessionStatus: "guest",
    session: null,
    oauthPendingUser: null,
    sessionError: null,
    onboardingPending: false,
  };
}

function readSessionCache(): StudentSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StudentSession;
  } catch {
    return null;
  }
}

function writeSessionCache(session: StudentSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
    return;
  }

  const payload =
    isClerkEnabledClient()
      ? { ...session, avatarUrl: undefined }
      : session;

  sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
}

async function fetchSessionWithRetry(): Promise<SessionApiResponse> {
  if (inFlightSessionRequest) {
    return inFlightSessionRequest;
  }

  inFlightSessionRequest = (async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < SESSION_FETCH_ATTEMPTS; attempt += 1) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 800 * attempt));
        }

        return await apiGetSession<SessionApiResponse>();
      } catch (error) {
        lastError = error;
        const isRetryable =
          error instanceof ApiError && (error.status === 408 || error.status >= 500);

        if (!isRetryable || attempt === SESSION_FETCH_ATTEMPTS - 1) {
          throw error;
        }
      }
    }

    throw lastError;
  })().finally(() => {
    inFlightSessionRequest = null;
  });

  return inFlightSessionRequest;
}

type StudentSessionContextValue = {
  session: StudentSession | null;
  demoSession: StudentDemoSession | null;
  isReady: boolean;
  isSessionValidated: boolean;
  sessionStatus: StudentSessionStatus;
  oauthPendingUser: OAuthPendingUser | null;
  sessionError: string | null;
  isAuthenticated: boolean;
  onboardingPending: boolean;
  isDemo: boolean;
  isLoggingOut: boolean;
  usesBackend: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshDemoSession: () => void;
  refreshSession: () => void;
  refreshSessionAsync: () => Promise<SessionSnapshot>;
  acknowledgeOnboardingComplete: () => void;
};

function readInitialSessionState(backend: boolean) {
  if (!backend) {
    return {
      session: null as StudentSession | null,
      sessionStatus: "guest" as StudentSessionStatus,
      isSessionValidated: true,
      isReady: true,
    };
  }

  const cached = readSessionCache();

  return {
    session: cached,
    sessionStatus: (cached ? "student" : "loading") as StudentSessionStatus,
    isSessionValidated: Boolean(cached),
    isReady: true,
  };
}

function readCachedSessionUserId(): string | undefined {
  return readSessionCache()?.userId;
}

export function readCachedStudentSession(): StudentSession | null {
  return readSessionCache();
}

export function readCachedStudentSessionUserId(): string | undefined {
  return readCachedSessionUserId();
}

const StudentSessionContext = createContext<StudentSessionContextValue | null>(null);

export function StudentSessionProvider({ children }: { children: ReactNode }) {
  const backend = isClientBackendEnabled();
  const clerkEnabled = isClerkEnabledClient();

  const [session, setSession] = useState<StudentSession | null>(
    () => readInitialSessionState(backend).session,
  );
  const [demoSession, setDemoSession] = useState<StudentDemoSession | null>(null);
  const [isReady, setIsReady] = useState(() => readInitialSessionState(backend).isReady);
  const [isSessionValidated, setIsSessionValidated] = useState(
    () => readInitialSessionState(backend).isSessionValidated,
  );
  const [sessionStatus, setSessionStatus] = useState<StudentSessionStatus>(
    () => readInitialSessionState(backend).sessionStatus,
  );
  const [oauthPendingUser, setOauthPendingUser] = useState<OAuthPendingUser | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [onboardingPending, setOnboardingPending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshWaitersRef = useRef<Array<(snapshot: SessionSnapshot) => void>>([]);
  const hydrateInFlightRef = useRef<Promise<void> | null>(null);
  const initialHydrateDoneRef = useRef(!backend);
  const isLoggingOutRef = useRef(false);

  const notifyRefreshWaiters = useCallback((snapshot: SessionSnapshot) => {
    const waiters = refreshWaitersRef.current;
    refreshWaitersRef.current = [];
    waiters.forEach((resolve) => resolve(snapshot));
  }, []);

  const refreshDemoSession = useCallback(() => {
    setDemoSession(readStudentDemoCookieFromDocument());
  }, []);

  const refreshSession = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const refreshSessionAsync = useCallback((): Promise<SessionSnapshot> => {
    return new Promise((resolve) => {
      refreshWaitersRef.current.push(resolve);
      if (!hydrateInFlightRef.current) {
        setRefreshToken((current) => current + 1);
      }
    });
  }, []);

  const acknowledgeOnboardingComplete = useCallback(() => {
    setOnboardingPending(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshDemoSession();
  }, [refreshDemoSession]);

  useEffect(() => {
    if (!clerkEnabled) {
      return;
    }

    function handleClerkAuthChange() {
      if (isLoggingOutRef.current) {
        return;
      }

      setRefreshToken((current) => current + 1);
    }

    window.addEventListener("emenza-clerk-auth-change", handleClerkAuthChange);
    return () => {
      window.removeEventListener("emenza-clerk-auth-change", handleClerkAuthChange);
    };
  }, [clerkEnabled]);

  useEffect(() => {
    async function hydrate() {
      if (isLoggingOutRef.current) {
        return;
      }

      if (!backend) {
        setIsReady(true);
        setIsSessionValidated(true);
        setSessionStatus("guest");
        setOauthPendingUser(null);
        setSessionError(null);
        setOnboardingPending(false);
        notifyRefreshWaiters({
          sessionStatus: "guest",
          session: null,
          oauthPendingUser: null,
          sessionError: null,
          isSessionValidated: true,
          onboardingPending: false,
        });
        return;
      }

      const cached = readSessionCache();
      const isBackgroundRefresh = initialHydrateDoneRef.current;

      setIsReady(true);
      setSessionError(null);

      if (!isBackgroundRefresh) {
        if (cached) {
          setSession(cached);
          setSessionStatus("student");
          setIsSessionValidated(true);
        } else {
          setIsSessionValidated(false);
          setSessionStatus("loading");
        }
      } else if (cached) {
        setSession(cached);
        setSessionStatus("student");
        setIsSessionValidated(true);
      }

      let bootstrapReleased = false;
      const bootstrapTimer = window.setTimeout(() => {
        if (bootstrapReleased) {
          return;
        }

        setIsSessionValidated(true);
        setSessionStatus((current) => (current === "loading" ? "guest" : current));
        setSessionError((current) =>
          current ??
          "Učitavanje sesije traje duže nego obično. Prikazujemo osnovni prikaz.",
        );
      }, SESSION_BOOTSTRAP_MS);

      try {
        const data = await fetchSessionWithRetry();
        if (isLoggingOutRef.current) {
          return;
        }

        const resolved = resolveSessionFromApi(data);

        setSession(resolved.session);
        setSessionStatus(resolved.sessionStatus);
        setOauthPendingUser(resolved.oauthPendingUser);
        setSessionError(resolved.sessionError);
        setOnboardingPending(resolved.onboardingPending);

        if (resolved.session) {
          writeSessionCache(resolved.session);
        } else if (resolved.sessionStatus !== "oauth_pending") {
          writeSessionCache(null);
        }

        setIsSessionValidated(true);
        initialHydrateDoneRef.current = true;
        notifyRefreshWaiters({
          ...resolved,
          isSessionValidated: true,
        });
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setSession(null);
          setSessionStatus("guest");
          setOauthPendingUser(null);
          setSessionError(null);
          setOnboardingPending(false);
          writeSessionCache(null);
        } else if (cached) {
          setSession(cached);
          setSessionStatus("student");
          setOauthPendingUser(null);
          setSessionError(null);
        } else {
          setSession(null);
          setSessionStatus("error");
          setOauthPendingUser(null);
          setOnboardingPending(false);
          setSessionError(
            error instanceof ApiError && error.status === 408
              ? "Učitavanje sesije je isteklo. Pokušajte ponovo."
              : "Učitavanje podataka naloga nije uspelo.",
          );
        }

        setIsSessionValidated(true);
        initialHydrateDoneRef.current = true;
        notifyRefreshWaiters({
          sessionStatus: cached ? "student" : "error",
          session: cached,
          oauthPendingUser: null,
          sessionError: cached
            ? null
            : error instanceof ApiError && error.status === 408
              ? "Učitavanje sesije je isteklo. Pokušajte ponovo."
              : "Učitavanje podataka naloga nije uspelo.",
          isSessionValidated: true,
          onboardingPending: false,
        });
      } finally {
        bootstrapReleased = true;
        window.clearTimeout(bootstrapTimer);
      }
    }

    const hydratePromise = hydrate();
    hydrateInFlightRef.current = hydratePromise;
    void hydratePromise.finally(() => {
      if (hydrateInFlightRef.current === hydratePromise) {
        hydrateInFlightRef.current = null;
      }
    });
  }, [backend, notifyRefreshWaiters, refreshToken]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      if (!backend) {
        refreshDemoSession();
        return Boolean(readStudentDemoCookieFromDocument());
      }

      try {
        const data = await apiPost<{
          user: SessionApiUser;
          profile: SessionApiProfile;
          onboardingPending?: boolean;
          authProvider?: StudentAuthProvider;
          canChangePassword?: boolean;
        }>("/api/auth/session", { identifier, password });

        if (data.profile.role !== "student") {
          return false;
        }

        const nextSession = buildStudentSession(data.user, data.profile, {
          authProvider: data.authProvider ?? "password",
          canChangePassword: data.canChangePassword ?? true,
        });
        const pending = resolveOnboardingPending(data);
        setSession(nextSession);
        setSessionStatus("student");
        setOauthPendingUser(null);
        setSessionError(null);
        setOnboardingPending(pending);
        writeSessionCache(nextSession);
        setIsSessionValidated(true);
        if (!pending) {
          markLandingPrefForApply();
        }
        return true;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        return false;
      }
    },
    [backend, refreshDemoSession],
  );

  const logout = useCallback(async () => {
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);
    const userId = session?.userId;

    try {
      if (backend) {
        if (clerkEnabled) {
          const clerk = (
            window as Window & {
              Clerk?: { signOut: () => Promise<void> };
            }
          ).Clerk;
          await clerk?.signOut();
        } else {
          const supabase = createSupabaseBrowserClient();
          await supabase?.auth.signOut();
        }
        await fetch("/api/auth/session", { method: "DELETE" });
      }
    } catch {
      // Nastavi sa lokalnim čišćenjem čak i ako remote odjava ne uspe.
    }

    setSession(null);
    setSessionStatus("guest");
    setOauthPendingUser(null);
    setSessionError(null);
    setOnboardingPending(false);
    setIsSessionValidated(true);
    writeSessionCache(null);
    clearUserSettingsCache(userId);
    clearStudentRemoteCache(userId);
    clearCachedClerkAvatarUrl();
    clearStudentDemoCookie();
    refreshDemoSession();
    isLoggingOutRef.current = false;
    setIsLoggingOut(false);
  }, [backend, clerkEnabled, refreshDemoSession, session?.userId]);

  const isDemo = false;
  const isAuthenticated = useMemo(() => {
    if (isDemo) {
      return true;
    }
    if (!backend) {
      return false;
    }
    return sessionStatus === "student" && Boolean(session);
  }, [backend, isDemo, session, sessionStatus]);

  const value = useMemo(
    () => ({
      session,
      demoSession,
      isReady: backend ? isReady : true,
      isSessionValidated: backend ? isSessionValidated : true,
      sessionStatus: backend ? sessionStatus : "guest",
      oauthPendingUser: backend ? oauthPendingUser : null,
      sessionError: backend ? sessionError : null,
      isAuthenticated,
      onboardingPending: backend ? onboardingPending : false,
      isDemo,
      isLoggingOut,
      login,
      logout,
      refreshDemoSession,
      refreshSession,
      refreshSessionAsync,
      acknowledgeOnboardingComplete,
      usesBackend: backend,
    }),
    [
      backend,
      demoSession,
      isAuthenticated,
      isDemo,
      isLoggingOut,
      isReady,
      isSessionValidated,
      login,
      logout,
      oauthPendingUser,
      onboardingPending,
      refreshDemoSession,
      refreshSession,
      refreshSessionAsync,
      acknowledgeOnboardingComplete,
      session,
      sessionError,
      sessionStatus,
    ],
  );

  return (
    <StudentSessionContext.Provider value={value}>{children}</StudentSessionContext.Provider>
  );
}

export function useStudentSessionContext() {
  const context = useContext(StudentSessionContext);
  if (!context) {
    throw new Error("useStudentSession must be used within StudentSessionProvider");
  }
  return context;
}
