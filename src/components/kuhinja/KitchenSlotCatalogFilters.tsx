"use client";

import { Search } from "lucide-react";
import { DishBadgePicker } from "@/components/dish-catalog/DishBadgePicker";
import { staffButtonSecondaryClass, staffInputClass } from "@/components/staff";
import type { DishBadge } from "@/lib/dish-catalog-mock";
import type { KitchenMenuSlotId } from "@/lib/kuhinja-mock";

type KitchenSlotCatalogFiltersProps = {
  slotId: KitchenMenuSlotId;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterBadges: DishBadge[];
  onFilterBadgesChange: (badges: DishBadge[]) => void;
  idPrefix?: string;
};

export function KitchenSlotCatalogFilters({
  slotId,
  searchQuery,
  onSearchQueryChange,
  filterBadges,
  onFilterBadgesChange,
  idPrefix = "jelovnik",
}: KitchenSlotCatalogFiltersProps) {
  const searchInputId = `${idPrefix}-search-${slotId}`;
  const hasActiveFilters = searchQuery.trim().length > 0 || filterBadges.length > 0;

  function clearFilters() {
    onSearchQueryChange("");
    onFilterBadgesChange([]);
  }

  return (
    <div className="mt-3 space-y-3 border-b border-black/5 pb-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor={searchInputId}>
            Pretraga
          </label>
          <div className="relative mt-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/35"
            />
            <input
              className={`${staffInputClass} pl-9`}
              id={searchInputId}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Pretraži jela…"
              type="search"
              value={searchQuery}
            />
          </div>
        </div>
        {hasActiveFilters ? (
          <button className={staffButtonSecondaryClass} onClick={clearFilters} type="button">
            Obriši filtere
          </button>
        ) : null}
      </div>
      <DishBadgePicker
        label="Filter po bedževima"
        onChange={onFilterBadgesChange}
        value={filterBadges}
      />
    </div>
  );
}
