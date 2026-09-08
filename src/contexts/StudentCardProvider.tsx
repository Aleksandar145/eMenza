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
import { useUserSettingsContext } from "@/contexts/UserSettingsProvider";
import { fetchMyCardFromApi, shouldUseCardsApi } from "@/lib/backend/cards-api";
import { ApiError } from "@/lib/api/client";
import { accountBalance } from "@/lib/dashboard-mock";
import {
  buildInactiveStudentAccountSnapshot,
  buildStudentAccountSnapshot,
  createInitialReferentCardsState,
  findCardByIdentifier,
  type ReferentCardsState,
  type StudentAccountSnapshot,
  type StudentCard,
} from "@/lib/referent-cards-mock";
import {
  loadReferentCardsState,
  subscribeReferentCards,
} from "@/lib/referent-cards-store";
import {
  readStudentCardCache,
  writeStudentCardCache,
} from "@/lib/student-remote-cache";

export type StudentCardState = "loading" | "active" | "inactive";

type StudentCardContextValue = {
  snapshot: StudentAccountSnapshot;
  isCardActive: boolean;
  cardState: StudentCardState;
  refresh: () => void;
  isLoaded: boolean;
  isRefreshing: boolean;
  currency: string;
  cardProfile: { faculty: string; role: string } | null;
};

const StudentCardContext = createContext<StudentCardContextValue | null>(null);

function resolveSnapshot(
  identifier: string,
  cardsState: ReferentCardsState,
): StudentAccountSnapshot {
  const card = findCardByIdentifier(cardsState.cards, identifier);
  if (card) {
    return buildStudentAccountSnapshot(card);
  }

  const digits = identifier.replace(/\D/g, "");
  if (digits.length >= 4) {
    const byDigits = findCardByIdentifier(cardsState.cards, digits);
    if (byDigits) {
      return buildStudentAccountSnapshot(byDigits);
    }
  }

  return buildInactiveStudentAccountSnapshot();
}

function readCachedCard(userId: string | undefined) {
  if (!userId) {
    return null;
  }
  return readStudentCardCache(userId);
}

const CARD_FETCH_BOOTSTRAP_MS = 12_000;

export function StudentCardProvider({ children }: { children: ReactNode }) {
  const backend = shouldUseCardsApi();
  const {
    isAuthenticated,
    isDemo,
    isReady: sessionReady,
    isSessionValidated,
    session,
  } = useStudentSession();
  const { settings } = useUserSettingsContext();
  const identifier = settings.profile.cardNumber || settings.profile.email || session?.email || "";

  const expectsRemote = backend && !isDemo;
  const useRemote = expectsRemote && sessionReady && isAuthenticated;
  const userId = session?.userId;

  const [cardsState, setCardsState] = useState<ReferentCardsState>(() =>
    createInitialReferentCardsState(),
  );
  const [remoteCard, setRemoteCard] = useState<StudentCard | null>(null);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const remoteLoadedRef = useRef(remoteLoaded);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    remoteLoadedRef.current = remoteLoaded;
  }, [remoteLoaded]);

  useLayoutEffect(() => {
    if (!expectsRemote || !userId) {
      return;
    }

    const cached = readCachedCard(userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteCard(cached);
      setRemoteLoaded(true);
    }
  }, [expectsRemote, userId]);

  const loadRemoteCard = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      if (!useRemote || !userId) {
        return;
      }

      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      const isRefresh = options?.isRefresh ?? remoteLoadedRef.current;
      const cachedCard = readCachedCard(userId);

      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!cachedCard) {
        setRemoteLoaded(false);
      } else if (!remoteCard) {
        setRemoteCard(cachedCard);
      }

      refreshInFlightRef.current = (async () => {
        let shouldMarkLoaded = isRefresh;

        try {
          const card = await fetchMyCardFromApi();
          setRemoteCard(card);
          writeStudentCardCache(userId, card);
          shouldMarkLoaded = true;
        } catch (error) {
          const cached = readCachedCard(userId);
          if (cached) {
            setRemoteCard(cached);
            shouldMarkLoaded = true;
          } else if (error instanceof ApiError && error.status === 401) {
            shouldMarkLoaded = false;
          } else if (isRefresh) {
            shouldMarkLoaded = true;
          } else {
            shouldMarkLoaded = true;
          }
        } finally {
          if (shouldMarkLoaded) {
            setRemoteLoaded(true);
          }
          setIsRefreshing(false);
          refreshInFlightRef.current = null;
        }
      })();

      return refreshInFlightRef.current;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useRemote, userId],
  );

  useEffect(() => {
    if (!useRemote || remoteLoaded || isRefreshing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRemoteLoaded(true);
    }, CARD_FETCH_BOOTSTRAP_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isRefreshing, remoteLoaded, useRemote]);

  useEffect(() => {
    if (useRemote) {
      return;
    }

    if (!expectsRemote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteLoaded(true);
      setCardsState(loadReferentCardsState());
      return subscribeReferentCards(() => {
        setCardsState(loadReferentCardsState());
      });
    }

    setRemoteCard(null);
    setRemoteLoaded(false);
    setIsRefreshing(false);
  }, [expectsRemote, useRemote]);

  useEffect(() => {
    if (useRemote) {
      void loadRemoteCard({ isRefresh: remoteLoadedRef.current });
    }
  }, [useRemote, loadRemoteCard]);

  useEffect(() => {
    if (!useRemote || !sessionReady) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadRemoteCard({ isRefresh: true });
      }
    }

    function handleWindowFocus() {
      void loadRemoteCard({ isRefresh: true });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void loadRemoteCard({ isRefresh: true });
    }, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.clearInterval(intervalId);
    };
  }, [useRemote, sessionReady, loadRemoteCard]);

  const snapshot = useMemo(() => {
    if (useRemote || (expectsRemote && remoteCard)) {
      if (remoteCard) {
        return buildStudentAccountSnapshot(remoteCard);
      }
      return buildInactiveStudentAccountSnapshot();
    }
    return resolveSnapshot(identifier, cardsState);
  }, [useRemote, expectsRemote, remoteCard, identifier, cardsState]);

  const cardState = useMemo((): StudentCardState => {
    if (expectsRemote) {
      if (!sessionReady || !isSessionValidated) {
        return "loading";
      }
      if (!isAuthenticated) {
        return "loading";
      }
      if (!remoteLoaded) {
        return "loading";
      }
      if (remoteCard && snapshot.effectiveStatus === "active") {
        return "active";
      }
      if (isRefreshing) {
        return "loading";
      }
      return "inactive";
    }
    return snapshot.effectiveStatus === "active" ? "active" : "inactive";
  }, [
    expectsRemote,
    isAuthenticated,
    isRefreshing,
    isSessionValidated,
    remoteCard,
    remoteLoaded,
    sessionReady,
    snapshot.effectiveStatus,
  ]);

  const refresh = useCallback(() => {
    if (useRemote) {
      void loadRemoteCard({ isRefresh: true });
      return;
    }
    setCardsState(loadReferentCardsState());
  }, [useRemote, loadRemoteCard]);

  const cardProfile = useMemo(
    () =>
      remoteCard
        ? {
            faculty: remoteCard.faculty,
            role: remoteCard.role,
          }
        : null,
    [remoteCard],
  );

  const value = useMemo(
    () => ({
      snapshot,
      isCardActive: cardState === "active",
      cardState,
      refresh,
      isLoaded: remoteLoaded,
      isRefreshing,
      currency: accountBalance.currency,
      cardProfile,
    }),
    [cardProfile, cardState, isRefreshing, refresh, remoteLoaded, snapshot],
  );

  return <StudentCardContext.Provider value={value}>{children}</StudentCardContext.Provider>;
}

export function useStudentCardContext() {
  const context = useContext(StudentCardContext);
  if (!context) {
    throw new Error("useStudentCard must be used within StudentCardProvider");
  }
  return context;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useStudentCardFromProfile(_profile: { cardNumber: string; email: string }) {
  return useStudentCardContext();
}
