"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Printer } from "lucide-react";
import { AdminDatePicker } from "@/components/admin/AdminDatePicker";
import { KitchenMenuWeekStrip, type MealFilterType } from "@/components/kuhinja/KitchenMenuWeekStrip";
import { KitchenPrepDetailView } from "@/components/kuhinja/KitchenPrepDetailView";
import { StaffCard } from "@/components/staff";
import { useKitchenWeekSelection } from "@/hooks/useKitchenWeekSelection";
import { useKuhinjaJelovnik } from "@/hooks/useKuhinjaJelovnik";
import { getDailyMenu } from "@/lib/kuhinja-jelovnik-store";
import { getDishesByIds, loadDishCatalogState } from "@/lib/dish-catalog-store";
import { createInitialDishCatalogState } from "@/lib/dish-catalog-mock";
import { getPrepDetailSummary } from "@/lib/kuhinja-prep-mock";
import type { PrepCountRow, PrepDetailRow, PrepDetailSlotGroup, PrepDetailSummary } from "@/lib/kuhinja-prep-mock";
import { kitchenSlotLabels, kitchenSlotOrder, kitchenSlotToMealField } from "@/lib/kuhinja-mock";
import { parseSlotDishes } from "@/lib/kuhinja-order-display";
import type { MealType } from "@/lib/meal-types";

const POSNO_BADGES = new Set(["posno", "voce", "povrce"]);

const ALL_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function computeClientFastingCount(
  reservations: { glavnoJelo: string; dodatak: string; salata: string; obrok: string }[],
): number {
  const catalog = loadDishCatalogState();
  const dishes = catalog.dishes.length > 0 ? catalog.dishes : createInitialDishCatalogState().dishes;

  function isPosnoDish(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    const match = dishes.find((dish) => dish.name.trim().toLowerCase() === normalized);
    if (!match) return false;
    return match.badges.some((badge) => POSNO_BADGES.has(badge));
  }

  return reservations.filter((row) => {
    const allNames: string[] = [];
    for (const slotId of kitchenSlotOrder) {
      const field = kitchenSlotToMealField[slotId];
      const rawValue = row[field as keyof typeof row] ?? "";
      const parsed = parseSlotDishes(rawValue).filter((dish) => dish.name.length > 0);
      for (const dish of parsed) {
        allNames.push(dish.name);
      }
    }
    if (allNames.length === 0) return false;
    return allNames.every((name) => isPosnoDish(name));
  }).length;
}

function combinePrepSummaries(summaries: PrepDetailSummary[]): PrepDetailSummary {
  const orderCount = summaries.reduce((s, m) => s + m.orderCount, 0);
  const totalPortions = summaries.reduce((s, m) => s + m.totalPortions, 0);
  const totalGrams = summaries.reduce((s, m) => s + m.totalGrams, 0);
  const fastingCount = summaries.reduce((s, m) => s + m.fastingCount, 0);
  const menuDishes = [...new Set(summaries.flatMap((m) => m.menuDishes))];
  const slotOrdererCounts: Record<string, number> = {};
  const rowsMap = new Map<string, PrepCountRow>();
  const detailRowsMap = new Map<string, PrepDetailRow>();
  const slotRowsMap = new Map<string, PrepDetailSlotGroup>();

  for (const s of summaries) {
    for (const [slot, count] of Object.entries(s.slotOrdererCounts)) {
      slotOrdererCounts[slot] = (slotOrdererCounts[slot] ?? 0) + count;
    }
    for (const row of s.rows) {
      const key = `${row.slot}:${row.dishName}`;
      const existing = rowsMap.get(key);
      if (existing) {
        existing.count += row.count;
        existing.ordererCount += row.ordererCount;
      } else {
        rowsMap.set(key, { ...row });
      }
    }
    for (const row of s.detailRows) {
      const key = `${row.slot}:${row.dishName}`;
      const existing = detailRowsMap.get(key);
      if (existing) {
        existing.count += row.count;
        existing.ordererCount += row.ordererCount;
        existing.totalGrams += row.totalGrams;
      } else {
        detailRowsMap.set(key, { ...row });
      }
    }
    for (const slot of s.rowsBySlot) {
      const existing = slotRowsMap.get(slot.slotId);
      if (existing) {
        existing.totalPortions += slot.totalPortions;
        existing.totalGrams += slot.totalGrams;
        existing.ordererCount += slot.ordererCount;
        for (const row of slot.rows) {
          const existingRow = existing.rows.find((r) => r.dishName === row.dishName);
          if (existingRow) {
            existingRow.count += row.count;
            existingRow.ordererCount += row.ordererCount;
            existingRow.totalGrams += row.totalGrams;
          } else {
            existing.rows.push({ ...row });
          }
        }
      } else {
        slotRowsMap.set(slot.slotId, { ...slot, rows: slot.rows.map((r) => ({ ...r })) });
      }
    }
  }

  const rows = Array.from(rowsMap.values());
  const detailRows = Array.from(detailRowsMap.values());
  const rowsBySlot = Array.from(slotRowsMap.values());
  const reservations = summaries.flatMap((s) => s.reservations);

  return {
    orderCount, totalPortions, rows, menuDishes,
    slotOrdererCounts: slotOrdererCounts as PrepDetailSummary["slotOrdererCounts"],
    detailRows, totalGrams, rowsBySlot, fastingCount, reservations,
  };
}

function formatOrderCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} porudžbina`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} porudžbine`;
  }

  return `${count} porudžbina`;
}

function formatPortionCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} porcija`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} porcije`;
  }

  return `${count} porcija`;
}

export function KitchenPrepPage() {
  useKuhinjaJelovnik();
  const { selectedDateKey: dateKey, todayDateKey, weekStripProps } = useKitchenWeekSelection();
  const [mealFilter, setMealFilter] = useState<MealFilterType>("lunch");
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [apiSummaries, setApiSummaries] = useState<Record<string, PrepDetailSummary | null>>({});

  const mealTypesToLoad: MealType[] = mealFilter === "all" ? ALL_MEAL_TYPES : [mealFilter];

  useEffect(() => {
    let cancelled = false;

    async function fetchFromApi() {
      const results: Record<string, PrepDetailSummary | null> = {};
      for (const mt of mealTypesToLoad) {
        try {
          const res = await fetch(`/api/kitchen/prep?date=${dateKey}&meal=${mt}`);
          if (res.ok) {
            results[mt] = await res.json();
          }
        } catch {
          /* fallback to mock */
        }
      }
      if (!cancelled) setApiSummaries((prev) => ({ ...prev, ...results }));
    }

    fetchFromApi();
    return () => { cancelled = true; };
  }, [dateKey, mealFilter]);

  const summary = useMemo(() => {
    const summaries: PrepDetailSummary[] = [];
    for (const mt of mealTypesToLoad) {
      const fromApi = apiSummaries[mt];
      summaries.push(fromApi ?? getPrepDetailSummary(dateKey, mt));
    }
    return summaries.length === 1 ? summaries[0] : combinePrepSummaries(summaries);
  }, [apiSummaries, dateKey, mealFilter]);
  const menu = mealFilter !== "all" ? getDailyMenu(dateKey, mealFilter) : null;
  const orderCountLabel = formatOrderCount(summary.orderCount);
  const fastingCount = useMemo(
    () => computeClientFastingCount(summary.reservations),
    [summary.reservations],
  );

  const rowsBySlot = useMemo(
    () =>
      kitchenSlotOrder.map((slotId) => {
        const rows = summary.rows.filter((row) => row.slot === slotId);
        return {
          slotId,
          label: kitchenSlotLabels[slotId],
          rows,
          total: rows.reduce((sum, row) => sum + row.count, 0),
        };
      }),
    [summary.rows],
  );

  return (
    <div className="space-y-5">
      <KitchenMenuWeekStrip
        onMealTypeChange={setMealFilter}
        selectedMealType={mealFilter}
        title="Priprema"
        {...weekStripProps}
      >
        <AdminDatePicker
          max={todayDateKey}
          onChange={weekStripProps.onSelectedDateChange}
          value={dateKey}
        />
      </KitchenMenuWeekStrip>

      <div className={`grid gap-4 ${isDetailExpanded ? "grid-cols-1" : "lg:grid-cols-[1.2fr_0.8fr]"}`}>
        <StaffCard className={isDetailExpanded ? "prep-detail-print" : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-black">Količine za pripremu</h2>
              <p className="mt-0.5 text-sm text-black/55">
                Agregacija iz zakazanih i aktivnih rezervacija.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              {isDetailExpanded ? (
                <>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
                    onClick={() => setIsDetailExpanded(false)}
                    type="button"
                  >
                    <ChevronUp aria-hidden="true" size={16} />
                    Sažmi prikaz
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4549b8]"
                    onClick={() => window.print()}
                    type="button"
                  >
                    <Printer aria-hidden="true" size={16} />
                    Izveštaj
                  </button>
                </>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4549b8] disabled:opacity-60"
                  disabled={summary.rows.length === 0}
                  onClick={() => setIsDetailExpanded(true)}
                  type="button"
                >
                  <ChevronDown aria-hidden="true" size={16} />
                  Vidi detaljnije
                </button>
              )}
            </div>
          </div>

          {summary.rows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-black/55">Nema rezervacija za izabrani period.</p>
          ) : isDetailExpanded ? (
            <KitchenPrepDetailView
              dateKey={dateKey}
              mealType={mealFilter}
              orderCountLabel={orderCountLabel}
              summary={summary}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {rowsBySlot.map((slot) => (
                <div className="rounded-xl bg-black/[0.03] px-4 py-4" key={slot.slotId}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                    {slot.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums text-black">
                    {formatPortionCount(slot.total)}
                  </p>
                  {slot.rows.length === 0 ? (
                    <p className="mt-3 text-sm text-black/45">Nema porudžbina za ovu kategoriju.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {slot.rows.map((row) => (
                        <li
                          className="flex items-center justify-between gap-3 text-sm"
                          key={`${row.slot}-${row.dishName}`}
                        >
                          <span className="font-medium text-black">{row.dishName}</span>
                          <span className="shrink-0 font-bold tabular-nums text-[#5055D2]">
                            × {row.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </StaffCard>

        {!isDetailExpanded ? (
          <div className="space-y-4">
          <StaffCard className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Posne porudžbine
                </p>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-black">
                  {fastingCount}
                </p>
              </div>
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {fastingCount > 0 && summary.orderCount > 0
                  ? `${Math.round((fastingCount / summary.orderCount) * 100)}%`
                  : "—"}
              </div>
            </div>
            <p className="mt-2 text-sm text-black/55">
              {fastingCount === 1
                ? "1 student je poručio posni obrok"
                : `${fastingCount} studenata je poručilo posni obrok`}
            </p>
          </StaffCard>
          <StaffCard className="p-5">
            <h2 className="text-base font-bold text-black">Plan jelovnika</h2>
            <p className="mt-0.5 text-sm text-black/55">Uporedi potražnju sa objavljenim jelovnikom.</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums text-black">{orderCountLabel}</p>
            {!menu ? (
              <p className="mt-4 text-sm text-black/55">Jelovnik nije kreiran za ovaj dan/obrok.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Status: {menu.published ? "Objavljen" : "Nacrt"}
                </p>
                {menu.slots.map((slot) => {
                  const dishNames = getDishesByIds(slot.dishIds).map((dish) => dish.name);
                  return (
                    <div className="rounded-xl bg-black/[0.03] px-4 py-3" key={slot.slotId}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                        {kitchenSlotLabels[slot.slotId]}
                      </p>
                      <p className="mt-1 text-sm text-black">
                        {dishNames.length > 0 ? dishNames.join(", ") : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </StaffCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
