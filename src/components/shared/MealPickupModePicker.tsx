"use client";

import { ShoppingBag, UtensilsCrossed } from "lucide-react";
import { mealPickupModeLabels, type MealPickupMode } from "@/lib/dashboard-mock";

type MealPickupModePickerProps = {
  value: MealPickupMode;
  onChange: (mode: MealPickupMode) => void;
  idPrefix?: string;
};

const options: {
  id: MealPickupMode;
  icon: typeof UtensilsCrossed;
  description: string;
}[] = [
  {
    id: "u_menzi",
    icon: UtensilsCrossed,
    description: "Jedete u menzi posle zalaska sunca.",
  },
  {
    id: "poneti",
    icon: ShoppingBag,
    description: "Iftar paket — preuzmite na šalteru i odnesite sa sobom.",
  },
];

export function MealPickupModePicker({
  value,
  onChange,
  idPrefix = "pickup-mode",
}: MealPickupModePickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-black/45">
        Način preuzimanja
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = value === option.id;
          const Icon = option.icon;

          return (
            <button
              aria-pressed={isActive}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                isActive
                  ? "border-[#5055D2] bg-[#5055D2]/10 ring-1 ring-[#5055D2]/20"
                  : "border-black/8 bg-white hover:border-[#5055D2]/25"
              }`}
              id={`${idPrefix}-${option.id}`}
              key={option.id}
              onClick={() => onChange(option.id)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <Icon
                  aria-hidden="true"
                  className={isActive ? "text-[#5055D2]" : "text-black/45"}
                  size={18}
                />
                <span
                  className={`text-sm font-bold ${isActive ? "text-[#5055D2]" : "text-black"}`}
                >
                  {mealPickupModeLabels[option.id]}
                </span>
              </span>
              <p className="mt-1.5 text-xs font-light leading-relaxed text-black/55">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default MealPickupModePicker;
