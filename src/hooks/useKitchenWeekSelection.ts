"use client";

import { useCallback, useState } from "react";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { getWeekStartForDate } from "@/lib/kuhinja-menu-overview";

type UseKitchenWeekSelectionOptions = {
  initialDateKey?: string;
  onSelectedDateChange?: (dateKey: string) => void;
  onWeekStartChange?: (weekStartDateKey: string) => void;
};

export function useKitchenWeekSelection({
  initialDateKey,
  onSelectedDateChange: onSelectedDateChangeExternal,
  onWeekStartChange: onWeekStartChangeExternal,
}: UseKitchenWeekSelectionOptions = {}) {
  const todayDateKey = useTodayDateKey();
  const resolvedInitialDateKey = initialDateKey ?? todayDateKey;

  const [selectedDateKey, setSelectedDateKey] = useState(resolvedInitialDateKey);
  const [weekStartDateKey, setWeekStartDateKey] = useState(() =>
    getWeekStartForDate(resolvedInitialDateKey, todayDateKey),
  );

  const handleSelectedDateChange = useCallback(
    (nextDateKey: string) => {
      setSelectedDateKey(nextDateKey);
      onSelectedDateChangeExternal?.(nextDateKey);
    },
    [onSelectedDateChangeExternal],
  );

  const handleWeekStartChange = useCallback(
    (nextWeekStart: string) => {
      setWeekStartDateKey(nextWeekStart);
      onWeekStartChangeExternal?.(nextWeekStart);
    },
    [onWeekStartChangeExternal],
  );

  return {
    todayDateKey,
    selectedDateKey,
    weekStartDateKey,
    setSelectedDateKey,
    setWeekStartDateKey,
    weekStripProps: {
      selectedDateKey,
      weekStartDateKey,
      onSelectedDateChange: handleSelectedDateChange,
      onWeekStartChange: handleWeekStartChange,
    },
  };
}
