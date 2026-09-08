"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStudentSession } from "@/hooks/useStudentSession";
import {
  fetchStudentStatisticsFromApi,
  shouldUseStatisticsApi,
  type StatisticsQueryParams,
} from "@/lib/backend/statistics-api";
import type { SpendingPeriod, StudentStatisticsPayload } from "@/lib/statistika-types";

type UseStudentStatisticsOptions = {
  period?: SpendingPeriod;
  anchorDate?: string;
  periodOffset?: number;
  page?: number;
  pageSize?: number;
  types?: StatisticsQueryParams["types"];
  from?: string;
  to?: string;
};

export function useStudentStatistics(options: UseStudentStatisticsOptions = {}) {
  const backend = shouldUseStatisticsApi();
  const { isAuthenticated, isDemo, isReady: sessionReady } = useStudentSession();
  const useRemote = backend && sessionReady && isAuthenticated && !isDemo;

  const [data, setData] = useState<StudentStatisticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!useRemote) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const task = (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchStudentStatisticsFromApi({
          period: options.period,
          anchorDate: options.anchorDate,
          periodOffset: options.periodOffset,
          page: options.page,
          pageSize: options.pageSize,
          types: options.types,
          from: options.from,
          to: options.to,
        });
        setData(payload);
      } catch (caught) {
        setData(null);
        setError(caught instanceof Error ? caught.message : "Failed to load statistics");
      } finally {
        setIsLoading(false);
      }
    })();

    refreshInFlightRef.current = task;

    try {
      await task;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [
    options.from,
    options.page,
    options.pageSize,
    options.period,
    options.anchorDate,
    options.periodOffset,
    options.to,
    options.types,
    useRemote,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

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

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refresh, sessionReady, useRemote]);

  return {
    data,
    isLoading,
    error,
    refresh,
    usesBackend: useRemote,
    isUnavailable: sessionReady && !useRemote,
    isPending: !sessionReady || (useRemote && isLoading && !data && !error),
  };
}
