"use client";

import {
  dishBadgeOptions,
  getBadgeLabel,
  type CustomBadgeDef,
  type DishBadge,
} from "@/lib/dish-catalog-mock";

type DishBadgePickerProps = {
  value: DishBadge[];
  onChange: (badges: DishBadge[]) => void;
  label?: string;
  customDefs?: CustomBadgeDef[];
};

export function DishBadgePicker({
  value,
  onChange,
  label = "Bedževi",
  customDefs = [],
}: DishBadgePickerProps) {
  function toggleBadge(badge: DishBadge) {
    if (value.includes(badge)) {
      onChange(value.filter((entry) => entry !== badge));
      return;
    }
    onChange([...value, badge]);
  }

  const allBadges = [...dishBadgeOptions, ...customDefs.map((d) => d.id)];

  return (
    <div className="col-span-full space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-black/45">{label}</p>
      <div className="flex flex-wrap gap-2">
        {allBadges.map((badge) => {
          const selected = value.includes(badge);
          return (
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                selected
                  ? "bg-[#5055D2] text-white"
                  : "border border-black/10 bg-white text-black/70 hover:bg-black/[0.03]"
              }`}
              key={badge}
              onClick={() => toggleBadge(badge)}
              type="button"
            >
              {getBadgeLabel(badge, customDefs)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
