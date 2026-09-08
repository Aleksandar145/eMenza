"use client";

import { PosnoBadge } from "@/components/shared/PosnoBadge";
import { PonetiBadge } from "@/components/shared/PonetiBadge";
import type { PickupOrder } from "@/lib/preuzimanje-mock";
import { StaffCard } from "@/components/staff";

type KitchenOrderDetailCardProps = {
  order: PickupOrder;
};

const slotLabels = [
  { key: "glavnoJelo" as const, label: "Glavno jelo" },
  { key: "dodatak" as const, label: "Dodatak" },
  { key: "salata" as const, label: "Salata" },
  { key: "obrok" as const, label: "Dezert" },
];

export function KitchenOrderDetailCard({ order }: KitchenOrderDetailCardProps) {
  return (
    <StaffCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Narudžbina pronađena
          </span>
          <h3 className="mt-1 text-lg font-bold text-black">{order.studentName}</h3>
          <p className="text-sm text-black/55">
            {order.dateLabel} · {order.mealLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-black">{order.pickupCode}</p>
          <p className="mt-0.5 text-xs text-black/45">{order.cardDisplayNumber}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {order.items.isPosno ? <PosnoBadge /> : null}
        {order.pickupMode === "poneti" ? <PonetiBadge /> : null}
      </div>

      <ul className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
        {slotLabels.map(({ key, label }) => (
          <li className="flex items-center justify-between px-4 py-3" key={key}>
            <span className="text-xs font-semibold uppercase tracking-wide text-black/45">
              {label}
            </span>
            <span className="text-sm font-semibold text-black">{order.items[key]}</span>
          </li>
        ))}
      </ul>
    </StaffCard>
  );
}
