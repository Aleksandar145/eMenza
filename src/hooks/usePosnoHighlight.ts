"use client";

import { useMemo } from "react";
import { type LiturgicalDayInfo } from "@/lib/liturgical-calendar";
import {
  getLiturgicalDisplayInfo,
  shouldPreferPosnoMeals,
  shouldShowPosnoMealsForDate,
  type FastingPreferences,
} from "@/lib/fasting-preferences";
import type { UserReligion } from "@/lib/user-preferences";

const emptyLiturgicalInfo: LiturgicalDayInfo = {
  period: "none",
  isOrthodoxFastDay: false,
  isPosnaDay: false,
  label: null,
  shortLabel: null,
};

export function usePosnoHighlight(
  dateKey: string,
  religion: UserReligion | "",
  fasting: FastingPreferences,
) {
  const showPosnoMeals = useMemo(
    () => shouldShowPosnoMealsForDate(religion, dateKey, fasting),
    [religion, dateKey, fasting],
  );
  const preferPosnoMeals = useMemo(
    () => shouldPreferPosnoMeals(religion, dateKey, fasting),
    [religion, dateKey, fasting],
  );
  const liturgicalInfo = useMemo(
    () =>
      showPosnoMeals
        ? getLiturgicalDisplayInfo(religion, dateKey, fasting)
        : emptyLiturgicalInfo,
    [dateKey, religion, fasting, showPosnoMeals],
  );

  return {
    showPosnoMeals,
    liturgicalInfo,
    isOptedInToFasting: preferPosnoMeals,
  };
}
