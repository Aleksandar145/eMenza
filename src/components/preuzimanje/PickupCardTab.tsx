"use client";

import { CreditCard, Nfc } from "lucide-react";
import type { PickupOrder } from "@/lib/preuzimanje-mock";

type PickupCardTabProps = {
  order: PickupOrder;
};

export function PickupCardTab({ order }: PickupCardTabProps) {
  const isTakeaway = order.pickupMode === "poneti";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#7c80e8] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
              <CreditCard aria-hidden="true" className="text-white" size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">eMenza kartica</p>
              <p className="text-[11px] font-medium text-white/80">{order.studentName}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-white/90">
            {isTakeaway ? "IFTAR" : "CARD"}
          </span>
        </div>
        <p className="mt-4 font-mono text-sm tracking-[0.14em] text-white/90">
          {order.cardDisplayNumber}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-3 py-3">
        <Nfc aria-hidden="true" className="mt-0.5 shrink-0 text-[#5055D2]" size={18} />
        <div>
          <p className="text-sm font-semibold text-black">
            {isTakeaway ? "Preuzmite iftar paket na šalteru" : "Prislonite karticu na čitač"}
          </p>
          <p className="mt-1 text-xs font-light leading-relaxed text-black/55">
            {isTakeaway
              ? `Osoblje vidi vašu narudžbinu (${order.mealLabel}, ${order.dateLabel}) i izdaje iftar paket za poneti.`
              : `Osoblje na šalteru vidi vašu narudžbinu (${order.mealLabel}, ${order.dateLabel}) i izdaje obrok prema rezervaciji.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PickupCardTab;
