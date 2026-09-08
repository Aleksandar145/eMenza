"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStudentSession } from "@/hooks/useStudentSession";
import { useStudentCardContext, type StudentCardState } from "@/hooks/useStudentCard";
import { cardStatusLabels, type CardStatus } from "@/lib/referent-cards-mock";
import { useT } from "@/i18n/useT";

type CardAccessContextValue = {
  snapshot: ReturnType<typeof useStudentCardContext>["snapshot"];
  isCardActive: boolean;
  cardState: StudentCardState;
  isLoaded: boolean;
  isRefreshing: boolean;
  refreshCard: () => void;
  showCardLock: boolean;
  statusCopy: { title: string; description: string };
  statusLabel: string;
  blockedModalOpen: boolean;
  guardAction: (action: () => void) => void;
  closeBlockedModal: () => void;
  openBlockedModal: () => void;
};

const CardAccessContext = createContext<CardAccessContextValue | null>(null);

function useCardStatusMessages() {
  const { t } = useT();

  return useMemo(
    (): Record<CardStatus, { title: string; description: string }> => ({
      pending_verification: {
        title: t("card.pendingTitle"),
        description: t("card.pendingDesc"),
      },
      active: {
        title: "",
        description: "",
      },
      blocked: {
        title: t("card.blockedTitle"),
        description: t("card.blockedDesc"),
      },
      expired: {
        title: t("card.expiredTitle"),
        description: t("card.expiredDesc"),
      },
    }),
    [t],
  );
}

function useCardStatusLabels() {
  const { t } = useT();

  return useMemo(
    (): Record<CardStatus, string> => ({
      pending_verification: t("card.statusPending"),
      active: t("card.statusActive"),
      blocked: t("card.statusBlocked"),
      expired: t("card.statusExpired"),
    }),
    [t],
  );
}

export function CardAccessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoggingOut } = useStudentSession();
  const { snapshot, cardState, isLoaded, refresh, isRefreshing } = useStudentCardContext();
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const statusMessages = useCardStatusMessages();
  const localizedStatusLabels = useCardStatusLabels();

  const statusCopy = useMemo(
    () => statusMessages[snapshot.effectiveStatus],
    [snapshot.effectiveStatus, statusMessages],
  );

  const isCardActive = cardState === "active";
  const showCardLock =
    isAuthenticated &&
    !isLoggingOut &&
    isLoaded &&
    !isRefreshing &&
    cardState === "inactive" &&
    snapshot.effectiveStatus !== "expired";

  const guardAction = useCallback(
    (action: () => void) => {
      if (isLoggingOut || !isAuthenticated || cardState === "loading") {
        return;
      }

      if (cardState !== "active") {
        setBlockedModalOpen(true);
        return;
      }

      action();
    },
    [cardState, isAuthenticated, isLoggingOut],
  );

  const value = useMemo(
    () => ({
      snapshot,
      isCardActive,
      cardState,
      isLoaded,
      isRefreshing,
      refreshCard: refresh,
      showCardLock,
      statusCopy,
      statusLabel: localizedStatusLabels[snapshot.effectiveStatus] ?? cardStatusLabels[snapshot.effectiveStatus],
      blockedModalOpen,
      guardAction,
      closeBlockedModal: () => setBlockedModalOpen(false),
      openBlockedModal: () => setBlockedModalOpen(true),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      blockedModalOpen,
      cardState,
      guardAction,
      isAuthenticated,
      isCardActive,
      isLoaded,
      isLoggingOut,
      isRefreshing,
      localizedStatusLabels,
      refresh,
      showCardLock,
      snapshot,
      statusCopy,
    ],
  );

  return <CardAccessContext.Provider value={value}>{children}</CardAccessContext.Provider>;
}

export function useCardAccess() {
  const context = useContext(CardAccessContext);
  if (!context) {
    throw new Error("useCardAccess must be used within CardAccessProvider");
  }
  return context;
}
