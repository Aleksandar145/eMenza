"use client";

import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useClientMounted } from "@/hooks/useClientMounted";
import { getSsrAlignDateKey } from "@/lib/date-utils";

/** SSR/hydration-safe "today" — ignores sessionStorage until client mount. */
export function useHydrationSafeDateAnchor() {
  const mounted = useClientMounted();
  const todayDateKey = useTodayDateKey();
  const ssrDateKey = getSsrAlignDateKey();
  const dateKey = mounted ? todayDateKey : ssrDateKey;

  return {
    dateKey,
    mounted,
    todayDateKey,
    ssrDateKey,
  };
}

export default useHydrationSafeDateAnchor;
