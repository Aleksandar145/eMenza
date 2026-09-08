"use client";

import { useCallback, useEffect, useState } from "react";
import { createInitialAdminSystemState, type AdminSystemState } from "@/lib/admin-system-mock";
import type { AdminApiScope } from "@/lib/backend/admin-api";
import {
  getAdminSyncStatus,
  hydrateAdminSystemFromStorage,
  loadAdminSystemState,
  subscribeAdminSystem,
  syncAdminSystemFromApi,
  type AdminSyncFailureKind,
} from "@/lib/admin-system-store";

type UseAdminSystemOptions = {
  scope?: AdminApiScope;
};

export function useAdminSystem(options?: UseAdminSystemOptions) {
  const scope = options?.scope ?? "public";
  const [state, setState] = useState<AdminSystemState>(() => createInitialAdminSystemState());
  const [syncStatus, setSyncStatus] = useState(() => getAdminSyncStatus());

  useEffect(() => {
    hydrateAdminSystemFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadAdminSystemState());
    setSyncStatus(getAdminSyncStatus());

    const timeoutId = window.setTimeout(() => {
      void syncAdminSystemFromApi({ scope }).then(() => {
        setState(loadAdminSystemState());
        setSyncStatus(getAdminSyncStatus());
      });
    }, 2_500);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncAdminSystemFromApi({ scope }).then(() => {
          setState(loadAdminSystemState());
          setSyncStatus(getAdminSyncStatus());
        });
      }
    }, 30_000);

    const unsubscribe = subscribeAdminSystem(() => {
      setState(loadAdminSystemState());
      setSyncStatus(getAdminSyncStatus());
    });

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      unsubscribe();
    };
  }, [scope]);

  const refresh = useCallback(() => {
    setState(loadAdminSystemState());
    setSyncStatus(getAdminSyncStatus());
  }, []);

  const retrySync = useCallback(async () => {
    await syncAdminSystemFromApi({ scope, force: true });
    setState(loadAdminSystemState());
    setSyncStatus(getAdminSyncStatus());
  }, [scope]);

  return {
    state,
    refresh,
    retrySync,
    syncFailed: syncStatus.syncFailed,
    isSyncing: syncStatus.isSyncing,
    hasCachedState: syncStatus.hasCachedState,
    hasSuccessfulRemoteSync: syncStatus.hasSuccessfulRemoteSync,
    lastSyncError: syncStatus.lastSyncError as AdminSyncFailureKind,
  };
}
