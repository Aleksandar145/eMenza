"use client";

import {
  getSlotDisplayMode,
  getSlotPortionLabel,
  getSlotTotalPortions,
  type ParsedDish,
} from "@/lib/kuhinja-order-display";
import type { KitchenMenuSlotId } from "@/lib/kuhinja-mock";
import { kitchenSlotLabels } from "@/lib/kuhinja-mock";

type KitchenSlotDishesDisplayProps = {
  dishes: ParsedDish[];
  slotId: KitchenMenuSlotId;
  prominent?: boolean;
  showLabel?: boolean;
};

function QuantityChip({ quantity }: { quantity: number }) {
  if (quantity <= 1) {
    return null;
  }

  return (
    <span className="inline-flex rounded-full bg-[#5055D2]/15 px-2 py-0.5 text-xs font-bold tabular-nums text-[#5055D2]">
      ×{quantity}
    </span>
  );
}

function PortionCard({
  dish,
  index,
  prominent = false,
}: {
  dish: ParsedDish;
  index: number;
  prominent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-black/5 bg-white px-3 py-3 ${
        prominent ? "sm:px-4 sm:py-4" : ""
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
        {getSlotPortionLabel(index)}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className={prominent ? "text-base font-bold text-black" : "text-sm font-semibold text-black"}>
          {dish.name}
        </span>
        <QuantityChip quantity={dish.quantity} />
      </div>
    </div>
  );
}

export function KitchenSlotDishesDisplay({
  dishes,
  slotId,
  prominent = false,
  showLabel = true,
}: KitchenSlotDishesDisplayProps) {
  const mode = getSlotDisplayMode(dishes);
  const totalPortions = getSlotTotalPortions(dishes);
  const label = kitchenSlotLabels[slotId];

  if (mode === "empty") {
    return showLabel ? (
      <div>
        {showLabel ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">{label}</p>
        ) : null}
        <p className="mt-1.5 text-sm text-black/40">—</p>
      </div>
    ) : (
      <span className="text-sm text-black/40">—</span>
    );
  }

  const header = showLabel ? (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          prominent ? "text-[#5055D2]" : "text-black/45"
        }`}
      >
        {label}
      </p>
      {totalPortions > 1 ? (
        <span className="inline-flex rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/55">
          {totalPortions} porcije
        </span>
      ) : null}
    </div>
  ) : null;

  const containerClass = prominent
    ? "rounded-2xl bg-[#5055D2]/8 px-4 py-4"
    : "rounded-xl border border-black/5 bg-black/[0.02] px-3 py-3";

  if (mode === "single") {
    return (
      <div className={containerClass}>
        {header}
        <span className={prominent ? "text-lg font-bold text-black" : "text-sm font-semibold text-black"}>
          {dishes[0].name}
        </span>
      </div>
    );
  }

  if (mode === "same") {
    const dish = dishes[0];
    return (
      <div className={containerClass}>
        {header}
        <div className="rounded-xl border border-black/5 bg-white px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={prominent ? "text-lg font-bold text-black" : "text-sm font-semibold text-black"}>
              {dish.name}
            </span>
            <QuantityChip quantity={dish.quantity} />
          </div>
          <p className="mt-1.5 text-xs text-black/50">Dupla porcija istog jela</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {header}
      <div className={`grid gap-2 ${prominent ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {dishes.map((dish, index) => (
          <PortionCard dish={dish} index={index} key={`${dish.name}-${index}`} prominent={prominent} />
        ))}
      </div>
    </div>
  );
}

export default KitchenSlotDishesDisplay;
