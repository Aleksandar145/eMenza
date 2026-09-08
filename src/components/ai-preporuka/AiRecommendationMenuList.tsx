"use client";

import { mealComponentSlots, type AiRecommendation } from "@/lib/ai-preporuka-mock";

type AiRecommendationMenuListProps = {
  recommendation: AiRecommendation;
  className?: string;
};

export function AiRecommendationMenuList({
  recommendation,
  className = "",
}: AiRecommendationMenuListProps) {
  const menuItems = mealComponentSlots.map((slot) => ({
    label: slot.label,
    value: recommendation.composedMenu[slot.id] ?? "—",
    price: recommendation.composedMenuPrices[slot.id],
  }));

  return (
    <div className={className}>
      <ul className="divide-y divide-black/5 rounded-2xl border border-black/5">
        {menuItems.map((item) => (
          <li className="flex items-center gap-3 px-4 py-3" key={item.label}>
            <span className="w-[5.5rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-black/45 sm:w-24 sm:text-sm sm:normal-case sm:tracking-normal">
              {item.label}
            </span>
            <span
              className={`min-w-0 flex-1 text-sm font-semibold ${
                item.value === "—" ? "font-normal text-black/30" : "text-black"
              }`}
            >
              {item.value}
            </span>
            <span
              className={`shrink-0 text-sm tabular-nums ${
                item.price ? "font-semibold text-[#5055D2]" : "text-black/30"
              }`}
            >
              {item.price ? `${item.price} RSD` : "—"}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-[#EFF1F4]/60 px-4 py-3">
          <span className="text-sm font-semibold text-black">Ukupno</span>
          <span className="text-sm font-bold tabular-nums text-[#5055D2]">
            {recommendation.price} RSD
          </span>
        </li>
      </ul>
    </div>
  );
}

export default AiRecommendationMenuList;
