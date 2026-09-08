"use client";

import { useState } from "react";
import { QrCode, Search } from "lucide-react";
import { KitchenOrderDetailCard } from "@/components/kuhinja/KitchenOrderDetailCard";
import { type PickupOrder } from "@/lib/preuzimanje-mock";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { lookupPickupViaApi, markPickupViaApi } from "@/lib/backend/reservations-api";
import { StaffCard, staffInputClass, staffButtonPrimaryClass, staffButtonSecondaryClass } from "@/components/staff";

type KitchenQrLookupPanelProps = {
  compact?: boolean;
};

const mealLabels: Record<string, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

export function KitchenQrLookupPanel({ compact = false }: KitchenQrLookupPanelProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PickupOrder | null>(null);

  async function handleLookup() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Unesite pickup QR kod.");
      setOrder(null);
      return;
    }
  
    try {
      // 1. Prvo markiramo kao preuzeto kroz tvoj postojeći API
      await markPickupViaApi(trimmed);
  
      // 2. Onda dobijamo podatke za prikaz
      const reservation = await lookupPickupViaApi(trimmed);
      
      setError(null);
      setOrder({
        id: reservation.id,
        dateKey: reservation.dateKey,
        dateLabel: formatCalendarDayLabel(reservation.dateKey),
        mealType: reservation.mealType,
        mealLabel: mealLabels[reservation.mealType] ?? reservation.mealType,
        pickupCode: reservation.pickupCode,
        studentName: "Student", // Ili šta god već piše u reservation objektu
        cardId: "—",
        cardDisplayNumber: "—",
        status: "preuzeto", // Ovde menjaš status!
        pickupMode: reservation.pickupMode,
        items: reservation.items,
      });
      
      alert("Uspešno preuzeto!");
    } catch {
      setError("Narudžbina nije pronađena ili je već preuzeta.");
      setOrder(null);
    }
  }

  return (
    <StaffCard className={`${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
          <QrCode aria-hidden="true" className="text-[#5055D2]" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-black">Pickup QR</h2>
          <p className="mt-0.5 text-sm font-light text-black/55">
            Nalepite sadržaj QR koda sa studentskog preuzimanja (npr. EMZ-20260303-L-847291).
          </p>
          <div className="mt-2">
            <button
              className={staffButtonSecondaryClass}
              onClick={() => {
                setInput("EMZ-20260303-L-847291");
                setError(null);
              }}
              type="button"
            >
              EMZ-20260303-L-847291
            </button>
          </div>
        </div>
      </div>

      <div className={`flex flex-col gap-3 ${compact ? "mt-3" : "mt-4"}`}>
        <textarea
          className={`${staffInputClass} min-h-[72px] font-mono resize-y`}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
          placeholder="EMZ-20260303-L-847291"
          value={input}
        />
        <button
          className={`${staffButtonPrimaryClass} inline-flex items-center justify-center gap-2 self-start`}
          onClick={handleLookup}
          type="button"
        >
          <Search aria-hidden="true" size={16} />
          Pretraži narudžbinu
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {order ? <KitchenOrderDetailCard order={order} /> : null}
      </div>
    </StaffCard>
  );
}
