"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStudentSession } from "@/hooks/useStudentSession";
import {
  fetchMyNotificationsFromApi,
  markAllNotificationsReadViaApi,
  markNotificationReadViaApi,
  shouldUseNotificationsApi,
} from "@/lib/backend/notifications-api";
import {
  readNotificationsCache,
  writeNotificationsCache,
} from "@/lib/student-remote-cache";
import type { StudentNotificationRecord } from "@/server/repositories/notifications";

type StudentNotificationsContextValue = {
  notifications: StudentNotificationRecord[];
  isLoaded: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  usesBackend: boolean;
  isPending: boolean;
};

const StudentNotificationsContext = createContext<StudentNotificationsContextValue | null>(null);

export function StudentNotificationsProvider({ children }: { children: ReactNode }) {
  const backend = shouldUseNotificationsApi();
  const { isAuthenticated, isDemo, isReady: sessionReady, session } = useStudentSession();
  const expectsRemote = backend && !isDemo;
  const useRemote = expectsRemote && sessionReady && isAuthenticated;
  const userId = session?.userId;

  const [notifications, setNotifications] = useState<StudentNotificationRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(() => !expectsRemote);
  const hasHydratedCacheRef = useRef(false);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  useLayoutEffect(() => {
    if (!expectsRemote || !userId) {
      return;
    }

    const cached = readNotificationsCache(userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications(cached);
      setIsLoaded(true);
      hasHydratedCacheRef.current = true;
    }
  }, [expectsRemote, userId]);

  const refresh = useCallback(async () => {
    if (!useRemote || !userId) {
      setIsLoaded(true);
      return;
    }

    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const task = (async () => {
      try {
        const list = await fetchMyNotificationsFromApi();
        setNotifications(list);
        writeNotificationsCache(userId, list);
      } catch {
        const cached = readNotificationsCache(userId);
        if (cached) {
          setNotifications(cached);
        }
      } finally {
        setIsLoaded(true);
      }
    })();

    refreshInFlightRef.current = task;

    try {
      await task;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [useRemote, userId]);

  useEffect(() => {
    if (!backend) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoaded(true);
      return;
    }

    if (!sessionReady) {
      return;
    }

    if (!isAuthenticated || isDemo) {
      setNotifications([]);
      setIsLoaded(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [backend, isAuthenticated, isDemo, refresh, sessionReady]);

  useEffect(() => {
    if (!useRemote || !sessionReady) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    function handleWindowFocus() {
      void refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refresh();
    }, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.clearInterval(intervalId);
    };
  }, [useRemote, sessionReady, refresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!useRemote) {
        return;
      }

      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );

      try {
        const updated = await markNotificationReadViaApi(id);
        setNotifications((current) => {
          const next = current.map((item) => (item.id === id ? updated : item));
          if (userId) {
            writeNotificationsCache(userId, next);
          }
          return next;
        });
      } catch {
        void refresh();
      }
    },
    [refresh, useRemote, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!useRemote) {
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));

    try {
      const list = await markAllNotificationsReadViaApi();
      setNotifications(list);
      if (userId) {
        writeNotificationsCache(userId, list);
      }
    } catch {
      void refresh();
    }
  }, [refresh, useRemote, userId]);

  const value = useMemo(
    () => ({
      notifications,
      isLoaded,
      refresh,
      markAsRead,
      markAllAsRead,
      usesBackend: expectsRemote,
      isPending: expectsRemote && (!sessionReady || (isAuthenticated && !isLoaded)),
    }),
    [
      expectsRemote,
      isAuthenticated,
      isLoaded,
      markAllAsRead,
      markAsRead,
      notifications,
      refresh,
      sessionReady,
    ],
  );

  return (
    <StudentNotificationsContext.Provider value={value}>
      {children}
    </StudentNotificationsContext.Provider>
  );
}

export function useStudentNotificationsContext() {
  const context = useContext(StudentNotificationsContext);
  if (!context) {
    throw new Error("useStudentNotifications must be used within StudentNotificationsProvider");
  }
  return context;
}
