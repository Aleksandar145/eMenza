"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { KitchenCounterLookupPanel } from "@/components/kuhinja/KitchenCounterLookupPanel";
import { KitchenCounterReservationPanel } from "@/components/kuhinja/KitchenCounterReservationPanel";
import { KitchenCounterStatsPanel } from "@/components/kuhinja/KitchenCounterStatsPanel";
import { KitchenCounterStatusBar } from "@/components/kuhinja/KitchenCounterStatusBar";
import { KitchenCounterTodayMenu } from "@/components/kuhinja/KitchenCounterTodayMenu";
import { KitchenOrderHistoryModal } from "@/components/kuhinja/KitchenOrderHistoryModal";
import { useKitchenMealClock } from "@/hooks/useKitchenMealClock";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import {
  getKitchenOrderHistory,
  getKitchenPendingPickups,
} from "@/lib/kuhinja-order-display";
import {
  getAllKitchenReservationsForMeal,
  getKitchenCounterStats,
} from "@/lib/kuhinja-prep-mock";
import { mapApiReservationToKitchen } from "@/lib/kitchen-counter-lookup";
import type { KitchenReservationRecord } from "@/lib/kuhinja-mock";

export function KitchenOrdersPage() {
  const [stats, setStats] = useState({ ordered: 0, pickedUp: 0, remaining: 0 });
  const [allReservations, setAllReservations] = useState<KitchenReservationRecord[]>([]);
  const dateKey = useTodayDateKey();
  const clock = useKitchenMealClock(dateKey);
  const [reservation, setReservation] = useState<KitchenReservationRecord | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const reservationRef = useRef<KitchenReservationRecord | null>(null);
  reservationRef.current = reservation;

  const history = useMemo(() => getKitchenOrderHistory(allReservations), [allReservations]);
  const pending = useMemo(() => getKitchenPendingPickups(allReservations), [allReservations]);

  const fetchStats = useCallback(async () => {
    if (!clock.mealType) return;
    try {
      const response = await fetch(`/api/statistics?type=kitchen&meal=${clock.mealType}&date=${dateKey}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        return;
      }
    } catch {}
    const fallback = getKitchenCounterStats(dateKey, clock.mealType);
    setStats(fallback);
  }, [clock.mealType, dateKey]);

  const fetchAllReservations = useCallback(async () => {
    try {
      const response = await fetch(`/api/reservations?kitchen=1&dateKey=${dateKey}&all=1`);
      if (response.ok) {
        const data = await response.json();
        setAllReservations((data.reservations ?? []).map(mapApiReservationToKitchen));
        return;
      }
    } catch {}
    const fallback = getAllKitchenReservationsForMeal(dateKey, clock.mealType ?? "lunch");
    setAllReservations(fallback);
  }, [dateKey, clock.mealType]);

  const handleNext = useCallback(() => {
    const current = reservationRef.current;
    if (current && current.status !== "iskorisceno") {
      setAllReservations((prev) =>
        prev.map((r) =>
          r.pickupCode === current.pickupCode
            ? { ...r, status: "iskorisceno" as const, bookingStatus: "uspesno" as const }
            : r,
        ),
      );
      setStats((prev) => ({
        ...prev,
        pickedUp: prev.pickedUp + 1,
        remaining: Math.max(0, prev.remaining - 1),
      }));
    }
    setReservation(null);
    setFocusToken((value) => value + 1);
    fetchStats();
    fetchAllReservations();
  }, [fetchStats, fetchAllReservations]);

  // 1. useEffect za automatsko dobavljanje statistike i rezervacija
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    fetchAllReservations();
  }, [fetchStats, fetchAllReservations]);

  // 2. useEffect za slušanje tastature (Enter)
  useEffect(() => {
    function handleEnterKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || historyOpen || pendingOpen) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) return;

      event.preventDefault();
      handleNext();
    }

    window.addEventListener("keydown", handleEnterKey);
    return () => window.removeEventListener("keydown", handleEnterKey);
  }, [handleNext, historyOpen, pendingOpen]);

  const statsDisabled = !clock.mealType;

  return (
    <div className="space-y-5">
      <KitchenCounterStatusBar clock={clock} />
      <KitchenCounterTodayMenu clock={clock} dateKey={dateKey} />

      {!clock.isServing ? (
        <p className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/55">
          Trenutno nema aktivnog servisa — statistike i pretraga su onemogućeni.
        </p>
      ) : null}

      <KitchenCounterStatsPanel
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenPending={() => setPendingOpen(true)}
        stats={stats}
        statsDisabled={statsDisabled}
      />

      {reservation ? (
        <KitchenCounterReservationPanel onNext={handleNext} reservation={reservation} />
      ) : null}

      <KitchenCounterLookupPanel
        dateKey={dateKey}
        focusToken={focusToken}
        isServing={clock.isServing}
        mealType={clock.mealType}
        onReservationFound={setReservation}
        isPickupCodeServed={(code) =>
          allReservations.some(
            (r) => r.pickupCode?.toUpperCase() === code && r.status === "iskorisceno",
          )
        }
      />

      <KitchenOrderHistoryModal
        history={history}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <KitchenOrderHistoryModal
        description="Korisnici koji su naručili za danas ali još nisu preuzeli."
        emptyMessage="Svi korisnici su preuzeli obrok ili nema aktivnih rezervacija."
        history={pending}
        icon={Clock}
        isOpen={pendingOpen}
        modalTitleId="kitchen-pending-modal-title"
        onClose={() => setPendingOpen(false)}
        title="Još nisu preuzeli"
        variant="pending"
      />
    </div>
  );
}

export default KitchenOrdersPage;