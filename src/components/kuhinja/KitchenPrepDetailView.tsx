"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { kitchenSlotLabels, kitchenSlotOrder, type KitchenMenuSlotId } from "@/lib/kuhinja-mock";
import { mealTypeLabels } from "@/lib/kuhinja-menu-overview";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import type { PrepDetailSummary } from "@/lib/kuhinja-prep-mock";
import type { MealType } from "@/lib/meal-types";

type KitchenPrepDetailViewProps = {
  summary: PrepDetailSummary;
  dateKey: string;
  mealType: MealType | "all";
  orderCountLabel: string;
};

type PrepDetailColumnId = "portions" | "share" | "gramsPerPortion" | "total";

type PrepDetailFilters = {
  slots: KitchenMenuSlotId[];
  columns: Record<PrepDetailColumnId, boolean>;
};

const defaultFilters: PrepDetailFilters = {
  slots: [...kitchenSlotOrder],
  columns: {
    portions: true,
    share: true,
    gramsPerPortion: true,
    total: true,
  },
};

const columnOptions: { id: PrepDetailColumnId; label: string; header: string }[] = [
  { id: "portions", label: "Porcije", header: "Porcije" },
  { id: "share", label: "Udeo", header: "Udeo" },
  { id: "gramsPerPortion", label: "g / porcija", header: "g/porc." },
  { id: "total", label: "Ukupno", header: "Ukupno" },
];

const slotAccentColors: Record<KitchenMenuSlotId, string> = {
  main: "border-l-[#5055D2]",
  side: "border-l-[#E8A838]",
  salad: "border-l-[#3BAF6B]",
  dessert: "border-l-[#D94F7C]",
};

function formatGrams(grams: number) {
  return `${grams.toLocaleString("sr-RS")} g`;
}

function formatKgFromGrams(grams: number) {
  if (grams >= 1000) {
    return `${(grams / 1000).toLocaleString("sr-RS", { maximumFractionDigits: 1, minimumFractionDigits: grams % 1000 === 0 ? 0 : 1 })} kg`;
  }

  return formatGrams(grams);
}

function formatOrderSharePercent(value: number) {
  return `${value.toLocaleString("sr-RS")}%`;
}

function formatCategoryOrderCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} porudžbina u kategoriji`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} porudžbine u kategoriji`;
  }

  return `${count} porudžbina u kategoriji`;
}

function formatDishOrderCount(count: number) {
  return `${count} porudžb.`;
}

function formatPrintedAt() {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function filtersEqual(a: PrepDetailFilters, b: PrepDetailFilters) {
  if (a.slots.length !== b.slots.length) {
    return false;
  }

  const slotsMatch = kitchenSlotOrder.every(
    (slotId) => a.slots.includes(slotId) === b.slots.includes(slotId),
  );

  if (!slotsMatch) {
    return false;
  }

  return (Object.keys(a.columns) as PrepDetailColumnId[]).every((key) => a.columns[key] === b.columns[key]);
}

function getActiveColumnLabels(columns: PrepDetailFilters["columns"]) {
  return columnOptions.filter((column) => columns[column.id]).map((column) => column.label);
}

function togglePillClass(isActive: boolean) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
    isActive ? "bg-[#5055D2] text-white" : "bg-black/5 text-black/70 hover:bg-black/10"
  }`;
}

export function KitchenPrepDetailView({
  summary,
  dateKey,
  mealType,
  orderCountLabel,
}: KitchenPrepDetailViewProps) {
  const [filters, setFilters] = useState<PrepDetailFilters>(defaultFilters);
  const storageKey = `prep-done-${dateKey}-${mealType}`;
  const [doneDishes, setDoneDishes] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        setDoneDishes(new Set(arr));
      } else {
        setDoneDishes(new Set());
      }
    } catch {
      setDoneDishes(new Set());
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...doneDishes]));
    } catch { /* noop */ }
  }, [doneDishes, storageKey]);

  const filteredSlots = useMemo(
    () => summary.rowsBySlot.filter((slot) => filters.slots.includes(slot.slotId)),
    [summary.rowsBySlot, filters.slots],
  );

  const filteredTotals = useMemo(
    () => ({
      portions: filteredSlots.reduce((sum, slot) => sum + slot.totalPortions, 0),
      grams: filteredSlots.reduce((sum, slot) => sum + slot.totalGrams, 0),
    }),
    [filteredSlots],
  );

  const isDefaultFilters = filtersEqual(filters, defaultFilters);
  const activeSlotLabels = filters.slots.map((slotId) => kitchenSlotLabels[slotId]);
  const activeColumnLabels = getActiveColumnLabels(filters.columns);
  const visibleColumns = columnOptions.filter((column) => filters.columns[column.id]);

  function toggleSlot(slotId: KitchenMenuSlotId) {
    setFilters((current) => {
      const isSelected = current.slots.includes(slotId);
      if (isSelected && current.slots.length <= 1) {
        return current;
      }

      const nextSlots = isSelected
        ? current.slots.filter((id) => id !== slotId)
        : [...current.slots, slotId];

      return {
        ...current,
        slots: kitchenSlotOrder.filter((id) => nextSlots.includes(id)),
      };
    });
  }

  function toggleColumn(columnId: PrepDetailColumnId) {
    setFilters((current) => {
      if (current.columns[columnId]) {
        const enabledCount = Object.values(current.columns).filter(Boolean).length;
        if (enabledCount <= 1) {
          return current;
        }
      }

      return {
        ...current,
        columns: {
          ...current.columns,
          [columnId]: !current.columns[columnId],
        },
      };
    });
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  function toggleDone(dishKey: string) {
    setDoneDishes((prev) => {
      const next = new Set(prev);
      if (next.has(dishKey)) {
        next.delete(dishKey);
      } else {
        next.add(dishKey);
      }
      return next;
    });
  }

  return (
    <div className="space-y-5 p-5">
      {/* Print header */}
      <header className="hidden border-b border-black/10 pb-4 print:block">
        <h2 className="text-xl font-bold text-black">Izveštaj pripreme</h2>
        <p className="mt-1 text-sm text-black/70">
          {formatCalendarDayLabel(dateKey)} · {mealType === "all" ? "Ceo dan" : mealTypeLabels[mealType]}
        </p>
        {!isDefaultFilters ? (
          <>
            <p className="mt-2 text-sm text-black/70">
              Kategorije: {activeSlotLabels.join(", ")}
            </p>
            <p className="mt-1 text-sm text-black/70">Kolone: {activeColumnLabels.join(", ")}</p>
          </>
        ) : null}
        <p className="mt-1 text-xs text-black/55">Štampano: {formatPrintedAt()}</p>
      </header>

      {/* Summary cards */}
      <div className="flex flex-wrap items-stretch gap-4 print:hidden">
        <div className="flex flex-1 flex-col justify-between rounded-2xl bg-[#5055D2] p-5 text-white">
          <p className="text-sm font-medium text-white/75">{orderCountLabel}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">
            {formatKgFromGrams(filteredTotals.grams)}
          </p>
          <p className="mt-1 text-sm text-white/60">Ukupno za pripremu</p>
        </div>
        <div className="flex min-w-[140px] flex-col justify-between rounded-2xl bg-black/[0.03] p-5">
          <p className="text-sm font-medium text-black/45">Porcije</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-black">
            {filteredTotals.portions}
          </p>
          <p className="mt-1 text-sm text-black/45">
            {Object.values(filters.columns).filter(Boolean).length} kolona
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="space-y-4 rounded-2xl border border-black/5 bg-[#EFF1F4]/50 p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Filter prikaza</p>
          <div className="flex flex-wrap items-center gap-3">
            {doneDishes.size > 0 ? (
              <button
                className="text-sm font-semibold text-[#D94F7C] hover:underline"
                onClick={() => setDoneDishes(new Set())}
                type="button"
              >
                Obeleženo: {doneDishes.size}
              </button>
            ) : null}
            {!isDefaultFilters ? (
              <button
                className="text-sm font-semibold text-[#5055D2] hover:underline"
                onClick={resetFilters}
                type="button"
              >
                Resetuj filter
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium text-black/55">Prikaži kategorije</p>
            <div className="flex flex-wrap gap-2">
              {kitchenSlotOrder.map((slotId) => {
                const isActive = filters.slots.includes(slotId);
                return (
                  <button
                    aria-pressed={isActive}
                    className={togglePillClass(isActive)}
                    key={slotId}
                    onClick={() => toggleSlot(slotId)}
                    type="button"
                  >
                    {kitchenSlotLabels[slotId]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-black/55">Kolone</p>
            <div className="flex flex-wrap gap-2">
              {columnOptions.map((column) => {
                const isActive = filters.columns[column.id];
                return (
                  <button
                    aria-pressed={isActive}
                    className={togglePillClass(isActive)}
                    key={column.id}
                    onClick={() => toggleColumn(column.id)}
                    type="button"
                  >
                    {column.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Slot tables */}
      <div className="space-y-6">
        {filteredSlots.map((slot) => (
          <section
            className={`rounded-2xl border border-black/5 bg-white ${slotAccentColors[slot.slotId]} border-l-4`}
            key={slot.slotId}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-black">{slot.label}</h3>
              <p className="text-sm text-black/55">
                {slot.totalPortions} porcija · {formatKgFromGrams(slot.totalGrams)}
                {slot.ordererCount > 0 ? (
                  <span className="text-black/45"> · {formatCategoryOrderCount(slot.ordererCount)}</span>
                ) : null}
              </p>
            </div>

            {slot.rows.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-black/45">Nema porudžbina za ovu kategoriju.</p>
            ) : (
              <div className="overflow-x-auto pb-1 print:overflow-visible">
                <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-y border-black/5 bg-black/[0.02] text-xs uppercase tracking-wide text-black/45 print:text-black/60">
                      <th className="py-3 pl-5 pr-4 font-semibold">Jelo</th>
                      {visibleColumns.map((column) => (
                        <th
                          className="py-3 pr-4 text-right font-semibold last:pr-5"
                          key={column.id}
                        >
                          {column.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slot.rows.map((row, idx) => {
                      const dishKey = `${row.slot}-${row.dishName}`;
                      const isDone = doneDishes.has(dishKey);

                      return (
                        <tr
                          className={`cursor-pointer border-b border-black/5 last:border-0 transition-colors ${
                            idx % 2 === 1 ? "bg-black/[0.015]" : ""
                          } ${isDone ? "opacity-50" : "hover:bg-black/[0.03]"}`}
                          key={dishKey}
                          onClick={() => toggleDone(dishKey)}
                        >
                          <td className="py-3 pl-5 pr-4 font-medium text-black">
                            <span className={`${isDone ? "line-through text-black/50" : ""}`}>
                              {row.dishName}
                            </span>
                            {(row.badges?.length ?? 0) > 0 ? (
                              <span className="mt-1 flex flex-wrap items-center gap-1">
                                <DishBadgeList badges={row.badges ?? []} limit={3} />
                              </span>
                            ) : null}
                            {isDone ? (
                              <span className="ml-2 text-xs text-[#3BAF6B] font-bold">&#10003;</span>
                            ) : null}
                          </td>
                          {filters.columns.portions ? (
                            <td className="py-3 pr-4 text-right tabular-nums text-black">
                              <span className="block">{row.count}</span>
                              <span className="mt-0.5 block text-xs text-black/45">
                                {formatDishOrderCount(row.ordererCount)}
                              </span>
                            </td>
                          ) : null}
                          {filters.columns.share ? (
                            <td className="py-3 pr-4 text-right font-semibold tabular-nums text-black">
                              {formatOrderSharePercent(row.orderSharePercent)}
                            </td>
                          ) : null}
                          {filters.columns.gramsPerPortion ? (
                            <td className="py-3 pr-4 text-right tabular-nums text-black/70">
                              {formatGrams(row.portionWeightGrams)}
                            </td>
                          ) : null}
                          {filters.columns.total ? (
                            <td className="py-3 pr-5 text-right font-bold tabular-nums text-[#5055D2] print:text-black">
                              {formatKgFromGrams(row.totalGrams)}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Bottom summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#5055D2]/5 px-5 py-4">
        <p className="text-sm font-semibold text-black">Ukupno za pripremu</p>
        <p className="text-lg font-extrabold tabular-nums text-[#5055D2] print:text-black">
          {filteredTotals.portions} porcija · {formatKgFromGrams(filteredTotals.grams)}
        </p>
      </div>
    </div>
  );
}

export default KitchenPrepDetailView;
