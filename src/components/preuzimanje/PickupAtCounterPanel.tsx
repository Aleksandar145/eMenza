"use client";

import Link from "next/link";
import { ArrowRight, QrCode, ShoppingBag, Ticket } from "lucide-react";
import { PickupCardTab } from "@/components/preuzimanje/PickupCardTab";
import { PonetiBadge } from "@/components/shared/PonetiBadge";
import { CounterQueueBadge } from "@/components/shared/CounterQueueBadge";
import { mealPickupModeLabels } from "@/lib/dashboard-mock";
import { getPreuzimanjeHref, type PickupOrder } from "@/lib/preuzimanje-mock";

type PickupAtCounterPanelProps = {
  order: PickupOrder;
};

export function PickupAtCounterPanel({ order }: PickupAtCounterPanelProps) {
  const isTakeaway = order.pickupMode === "poneti";

  return (
    <div className="mt-4 rounded-2xl border border-[#5055D2]/20 bg-[#5055D2]/[0.03] p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5055D2]">
            {isTakeaway ? "Preuzimanje iftar paketa" : "Preuzimanje na šalteru"}
          </p>
          <CounterQueueBadge
            className="mt-2"
            dateKey={order.dateKey}
            mealType={order.mealType}
            variant="row"
          />
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-bold text-black">
            <span>
              {order.mealLabel} · {order.dateLabel}
            </span>
            {isTakeaway ? <PonetiBadge size="md" /> : null}
          </p>
          {isTakeaway ? (
            <p className="mt-1 text-xs font-light text-black/55">
              {mealPickupModeLabels.poneti} — paket spreman posle zalaska sunca.
            </p>
          ) : null}
        </div>
        <span className="rounded-full bg-[#55de9a]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1a7a4a]">
          Spremno
        </span>
      </div>

      <div className="mt-4">
        <PickupCardTab order={order} />
      </div>

      <Link
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#5055D2]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:border-[#5055D2] hover:bg-[#5055D2]/5"
        href={getPreuzimanjeHref({ dateKey: order.dateKey, obrok: order.mealType })}
      >
        <QrCode aria-hidden="true" size={16} />
        {isTakeaway ? "QR kod za iftar paket" : "Koristi QR kod umesto kartice"}
        <ArrowRight aria-hidden="true" size={16} />
      </Link>

      {isTakeaway ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#5055D2]">
          <ShoppingBag aria-hidden="true" size={14} />
          Pokažite QR ili karticu na šalteru za preuzimanje paketa.
        </p>
      ) : null}

      <p className="mt-4 border-t border-black/5 pt-3 text-xs font-light text-black/55">
        Nakon preuzimanja obroka dobijate{" "}
        <Link className="inline-flex items-center gap-1 font-semibold text-[#5055D2] hover:underline" href="/moj-zeton">
          <Ticket aria-hidden="true" size={12} />
          eZeton za pribor
        </Link>
        .
      </p>
    </div>
  );
}

export default PickupAtCounterPanel;
