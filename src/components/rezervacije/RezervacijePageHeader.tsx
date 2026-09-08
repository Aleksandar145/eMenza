"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { BalanceMiniStrip } from "@/components/dashboard/BalanceMiniStrip";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import { ReservationBookByCountdown } from "@/components/shared/ReservationBookByCountdown";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useMealReservations } from "@/hooks/useMealReservations";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { getNextUnreservedMealSlot, type MealType, type NextUnreservedMealSlot } from "@/lib/dashboard-mock";
import { getNextUnreservedMealSlotFromReservations } from "@/lib/reservations-view";
import { getMealTypeLabel } from "@/i18n/catalog";
import { useT } from "@/i18n/useT";

type RezervacijePageHeaderProps = {
  onSmartReserve: (dateKey: string, mealType: MealType) => void;
  className?: string;
};

export function RezervacijePageHeader({
  onSmartReserve,
  className = "",
}: RezervacijePageHeaderProps) {
  const mounted = useClientMounted();
  const todayDateKey = useTodayDateKey();
  const { reservations, usesBackend } = useMealReservations();
  const { language, t } = useT();
  const [displaySlot, setDisplaySlot] = useState<NextUnreservedMealSlot | null>(null);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplaySlot(
      usesBackend
        ? getNextUnreservedMealSlotFromReservations(reservations, todayDateKey)
        : getNextUnreservedMealSlot(),
    );
  }, [mounted, reservations, todayDateKey, usesBackend]);

  return (
    <div className={`space-y-3 ${className}`}>
      <BalanceMiniStrip />

      {displaySlot ? (
        <MealBookingLockedSection>
          <button
            className="group flex w-full items-center gap-3 rounded-[20px] border border-[#5055D2]/15 bg-gradient-to-r from-[#5055D2]/5 to-[#9093E1]/10 px-4 py-3 text-left transition-all hover:border-[#5055D2]/30 active:scale-[0.99] lg:px-5"
            onClick={() => onSmartReserve(displaySlot.dateKey, displaySlot.mealType)}
            type="button"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5055D2]/12">
              <CalendarPlus aria-hidden="true" className="text-[#5055D2]" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#5055D2] lg:text-base">
                {t("reservations.smartReserve", {
                  meal: getMealTypeLabel(language, displaySlot.mealType),
                  date: displaySlot.dateLabel,
                })}
              </span>
              <ReservationBookByCountdown
                className="block text-xs font-light text-black/45"
                dateKey={displaySlot.dateKey}
                mealType={displaySlot.mealType}
                status="nerezervisano"
                variant="inline"
              />
            </span>
            <ArrowRight
              aria-hidden="true"
              className="shrink-0 text-[#5055D2]/45 transition-transform group-hover:translate-x-0.5"
              size={18}
            />
          </button>
        </MealBookingLockedSection>
      ) : null}
    </div>
  );
}

export default RezervacijePageHeader;
