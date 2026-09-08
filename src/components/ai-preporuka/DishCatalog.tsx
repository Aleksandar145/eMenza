"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { creatorSlotOrder, creatorSlotLabels, type CreatorSlotId } from "@/lib/kreator-obroka-mock";
import { getDishesByCategory } from "@/lib/dish-catalog-store";


type DishCatalogProps = {
  wishlistKeysBySlot: Record<CreatorSlotId, Set<string>>;
  onAdd: (slotId: CreatorSlotId, dishId: string) => void;
  preferPosno?: boolean;
};

export function DishCatalog({
  wishlistKeysBySlot,
  onAdd,
  preferPosno = false,
}: DishCatalogProps) {
  const [search, setSearch] = useState("");
  const [activeSlot, setActiveSlot] = useState<CreatorSlotId>("main");

  const addedKeys = wishlistKeysBySlot[activeSlot];

  const categoryDishes = useMemo(() => {
    const dishes = getDishesByCategory(activeSlot);
    return dishes.filter((dish) => {
      if (addedKeys.has(dish.id)) return false;
      if (preferPosno && !dish.badges.includes("posno")) return false;
      const q = search.trim().toLowerCase();
      return !q || dish.name.toLowerCase().includes(q);
    });
  }, [activeSlot, addedKeys, preferPosno, search]);

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="border-b border-black/5 px-5 py-4 lg:px-6 lg:py-5">
        <h2 className="text-xl font-bold text-black lg:text-2xl">Katalog jela</h2>
        <p className="mt-1 text-sm font-light text-black/55">
          Dodajte jela u listu želja za svaku kategoriju.
        </p>
      </div>

      <div className="px-5 py-3 lg:px-6">
        <div className="inline-flex rounded-full border border-black/5 bg-[#EFF1F4]/60 p-0.5">
          {creatorSlotOrder.map((slotId) => {
            const isActive = activeSlot === slotId;
            return (
              <button
                aria-pressed={isActive}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors lg:px-4 lg:text-sm ${
                  isActive
                    ? "bg-[#5055D2] text-white"
                    : "text-black/55 hover:text-[#5055D2]"
                }`}
                key={slotId}
                onClick={() => setActiveSlot(slotId)}
                type="button"
              >
                {creatorSlotLabels[slotId]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 lg:px-6">
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-[#EFF1F4]/50 px-3 py-2">
          <Search aria-hidden="true" className="shrink-0 text-black/30" size={16} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/30"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretraži jela..."
            type="text"
            value={search}
          />
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto px-5 py-4 lg:px-6">
        {categoryDishes.length === 0 ? (
          <p className="py-8 text-center text-sm text-black/45">
            {preferPosno
              ? "Nema posnih jela u ovoj kategoriji."
              : "Nema jela u ovoj kategoriji."}
          </p>
        ) : (
          <ul className="space-y-3">
            {categoryDishes.map((dish) => (
                <li
                  className="flex items-center gap-3 rounded-xl border border-black/5 bg-[#EFF1F4]/30 px-4 py-3 transition-colors hover:border-[#5055D2]/20"
                  key={dish.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-black">{dish.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <DishBadgeList badges={dish.badges} size="sm" />
                      <span className="text-xs font-semibold tabular-nums text-[#5055D2]">
                        {dish.priceRsd} RSD
                      </span>
                    </div>
                  </div>
                  <button
                    aria-label={`Dodaj ${dish.name}`}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5055D2] text-white transition-opacity hover:opacity-90"
                    onClick={() => onAdd(activeSlot, dish.id)}
                    type="button"
                  >
                    <Plus aria-hidden="true" size={18} />
                  </button>
                </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
