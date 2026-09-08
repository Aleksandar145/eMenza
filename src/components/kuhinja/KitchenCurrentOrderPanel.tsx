"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { KitchenOrderHistoryModal } from "@/components/kuhinja/KitchenOrderHistoryModal";
import { KitchenReservationDetailCard } from "@/components/kuhinja/KitchenReservationDetailCard";
import { StaffBadge, StaffCard, staffButtonSecondaryClass } from "@/components/staff";
import {
  getCurrentKitchenReservation,
  getKitchenOrderHistory,
} from "@/lib/kuhinja-order-display";
import { getAllKitchenReservationsForMeal } from "@/lib/kuhinja-prep-mock";
import type { MealType } from "@/lib/meal-types";

type KitchenCurrentOrderPanelProps = {
  dateKey: string;
  mealType: MealType;
  title?: string;
  description?: string;
  showHeader?: boolean;
};

export function KitchenCurrentOrderPanel({
  dateKey,
  mealType,
  title = "Ručak danas — detalj narudžbina",
  description = "Jela, količine i eZeton za studenta koji je sledeći u redu.",
  showHeader = true,
}: KitchenCurrentOrderPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const allRecords = useMemo(
    () => getAllKitchenReservationsForMeal(dateKey, mealType),
    [dateKey, mealType],
  );
  const current = useMemo(() => getCurrentKitchenReservation(allRecords), [allRecords]);
  const history = useMemo(() => getKitchenOrderHistory(allRecords), [allRecords]);

  const content = (
    <>
      {showHeader ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-black">{title}</h2>
            <p className="mt-0.5 text-sm text-black/55">{description}</p>
          </div>
          <button
            className={`${staffButtonSecondaryClass} inline-flex items-center gap-2`}
            onClick={() => setHistoryOpen(true)}
            type="button"
          >
            <History aria-hidden="true" size={16} />
            Istorija
            {history.length > 0 ? <StaffBadge count={history.length} variant="neutral" /> : null}
          </button>
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          <button
            className={`${staffButtonSecondaryClass} inline-flex items-center gap-2`}
            onClick={() => setHistoryOpen(true)}
            type="button"
          >
            <History aria-hidden="true" size={16} />
            Istorija
            {history.length > 0 ? <StaffBadge count={history.length} variant="neutral" /> : null}
          </button>
        </div>
      )}

      {current ? (
        <KitchenReservationDetailCard reservation={current} />
      ) : (
        <StaffCard className="p-8 text-center">
          <p className="text-sm text-black/55">Nema aktivnih narudžbina u redu.</p>
        </StaffCard>
      )}

      <KitchenOrderHistoryModal
        history={history}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );

  if (showHeader) {
    return <StaffCard padding="md">{content}</StaffCard>;
  }

  return <div>{content}</div>;
}

export default KitchenCurrentOrderPanel;
