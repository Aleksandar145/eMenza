"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  formatCalendarDateLabel,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import type { DailyMenuEntry } from "@/lib/kuhinja-mock";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { loadKuhinjaJelovnikState } from "@/lib/kuhinja-jelovnik-store";
import { apiFetch } from "@/lib/api/client";
import { getDishesByIds } from "@/lib/dish-catalog-store";
import { kitchenSlotLabels, kitchenSlotOrder } from "@/lib/kuhinja-mock";
import { mealTypeLabels } from "@/lib/kuhinja-menu-overview";
import { getWeekDayKeys, getWeekStartForDate, shiftWeekStart, formatWeekRangeLabel } from "@/lib/kuhinja-menu-overview";
import { getBlockedDishesForMeal, blockDish, unblockDish, type BlockedDish } from "@/lib/blocked-dishes-store";
import { publishNotice } from "@/lib/admin-system-store";
import { useToast } from "@/components/shared/toast/useToast";
import { StaffCard, StaffBadge } from "@/components/staff";
import { BlockDishDialog } from "@/components/admin/BlockDishDialog";
import type { MealType } from "@/lib/meal-types";

const WEEKDAY_LABELS = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];

function getDayMealStatus(entry: DailyMenuEntry | undefined): "published" | "draft" | "missing" {
  if (!entry) return "missing";
  return entry.published ? "published" : "draft";
}

export function AdminSchedulePage() {
  const todayKey = useTodayDateKey();
  const today = parseDateKey(todayKey);
  const { state: dishCatalog } = useDishCatalog();
  const toast = useToast();

  const [menus, setMenus] = useState<DailyMenuEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStartDateKey, setWeekStartDateKey] = useState(
    todayKey ? getWeekStartForDate(todayKey, todayKey) : "",
  );
  const [selectedCell, setSelectedCell] = useState<{ dateKey: string; mealType: MealType } | null>(null);
  const [blockTarget, setBlockTarget] = useState<{
    dishId: string;
    dishName: string;
    dateKey: string;
    mealType: MealType;
    existingBlock?: BlockedDish;
  } | null>(null);
  const [blockAllTarget, setBlockAllTarget] = useState<{
    dateKey: string;
    mealType: MealType;
    dishNames: string[];
  } | null>(null);
  const [blockAllReason, setBlockAllReason] = useState("");
  const [unblockAllTarget, setUnblockAllTarget] = useState<{
    dateKey: string;
    mealType: MealType;
    dishNames: string[];
  } | null>(null);
  const [, setBlockedTick] = useState(0);

  const weekDateKeys = useMemo(() => {
    if (!weekStartDateKey) return [];
    return getWeekDayKeys(weekStartDateKey, 7);
  }, [weekStartDateKey]);

  const fetchRange = useMemo(() => {
    if (weekDateKeys.length === 0) return { from: "", to: "" };
    const from = toDateKey(addDays(parseDateKey(weekDateKeys[0])!, -1));
    const last = weekDateKeys[weekDateKeys.length - 1];
    const to = toDateKey(addDays(parseDateKey(last)!, 1));
    return { from, to };
  }, [weekDateKeys]);

  const fetchMenus = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    setLoading(true);
    try {
      if (isClientBackendEnabled()) {
        const resp = await apiFetch<{ menus: DailyMenuEntry[] }>(
          `/api/admin/menus?from=${from}&to=${to}`,
        );
        setMenus(resp.menus);
      } else {
        setMenus(loadKuhinjaJelovnikState().menus);
      }
    } catch {
      if (!isClientBackendEnabled()) {
        setMenus(loadKuhinjaJelovnikState().menus);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMenus(fetchRange.from, fetchRange.to);
  }, [fetchRange.from, fetchRange.to, fetchMenus]);

  const menuMap = useMemo(() => {
    const map = new Map<string, DailyMenuEntry>();
    for (const menu of menus) {
      map.set(`${menu.dateKey}:${menu.mealType}`, menu);
    }
    return map;
  }, [menus]);

  const weekRangeLabel = weekStartDateKey ? formatWeekRangeLabel(weekStartDateKey, 7) : "";

  const handlePrevWeek = () => {
    setWeekStartDateKey(shiftWeekStart(weekStartDateKey, -1));
    setSelectedCell(null);
  };

  const handleNextWeek = () => {
    setWeekStartDateKey(shiftWeekStart(weekStartDateKey, 1));
    setSelectedCell(null);
  };

  const handleGoToday = () => {
    if (todayKey) {
      setWeekStartDateKey(getWeekStartForDate(todayKey, todayKey));
    }
  };

  function statusBadgeVariant(status: "published" | "draft" | "missing") {
    if (status === "published") return "success" as const;
    if (status === "missing") return "neutral" as const;
    return "warning" as const;
  }

  function statusLabel(status: "published" | "draft" | "missing") {
    if (status === "published") return "Objavljen";
    if (status === "draft") return "Nacrt";
    return "Nedostaje";
  }

  const selectedDayMeals = useMemo(() => {
    if (!selectedCell) return null;
    const breakfast = menuMap.get(`${selectedCell.dateKey}:breakfast`);
    const lunch = menuMap.get(`${selectedCell.dateKey}:lunch`);
    const dinner = menuMap.get(`${selectedCell.dateKey}:dinner`);
    return { breakfast, lunch, dinner, dateKey: selectedCell.dateKey };
  }, [selectedCell, menuMap]);

  function handleBlockConfirm(reason: string) {
    if (!blockTarget) return;

    if (blockTarget.existingBlock) {
      unblockDish(blockTarget.existingBlock.id);
      toast.success(`Jelo "${blockTarget.dishName}" odblokirano.`);
    } else {
      const weekdayIdx = weekDateKeys.indexOf(blockTarget.dateKey);
      const weekdayLabel = WEEKDAY_LABELS[weekdayIdx] ?? blockTarget.dateKey;
      const mealLabel = mealTypeLabels[blockTarget.mealType];

      const entry = blockDish({
        dishId: blockTarget.dishId,
        dishName: blockTarget.dishName,
        dateKey: blockTarget.dateKey,
        mealType: blockTarget.mealType,
        reason,
        blockedBy: "Admin",
      });

      void publishNotice({
        title: `Blokirano jelo: ${blockTarget.dishName}`,
        message: `Jelo "${blockTarget.dishName}" je blokirano za ${weekdayLabel}, ${mealLabel}. Razlog: ${reason}. Zamenite ovo jelo u jelovniku.`,
        priority: "important",
        targets: ["kitchen"],
        displayMode: "popup",
        actionHref: `/kuhinja/pregled-jelovnika`,
        actionLabel: "Otvori jelovnik",
      });

      toast.success(`Jelo "${blockTarget.dishName}" blokirano. Kuhinja je obaveštena.`);
    }

    setBlockTarget(null);
    setBlockedTick((t) => t + 1);
  }

  function getBlockedForMeal(dateKey: string, mealType: MealType) {
    return getBlockedDishesForMeal(dateKey, mealType);
  }

  function handleBlockAllConfirm() {
    if (!blockAllTarget || !blockAllReason.trim()) return;

    const { dateKey, mealType, dishNames } = blockAllTarget;
    const entry = menuMap.get(`${dateKey}:${mealType}`);
    if (!entry) return;

    const allDishes = getDishesByIds(
      entry.slots.flatMap((s) => s.dishIds),
    );

    const alreadyBlocked = getBlockedDishesForMeal(dateKey, mealType);
    const alreadyBlockedIds = new Set(alreadyBlocked.map((b) => b.dishId));

    let blockedCount = 0;
    for (const dish of allDishes) {
      if (!alreadyBlockedIds.has(dish.id)) {
        blockDish({
          dishId: dish.id,
          dishName: dish.name,
          dateKey,
          mealType,
          reason: blockAllReason.trim(),
          blockedBy: "Admin",
        });
        blockedCount++;
      }
    }

    if (blockedCount > 0) {
      const weekdayIdx = weekDateKeys.indexOf(dateKey);
      const weekdayLabel = WEEKDAY_LABELS[weekdayIdx] ?? dateKey;
      const mealLabel = mealTypeLabels[mealType];

      void publishNotice({
        title: `Blokirano ${blockedCount} jela: ${weekdayLabel} ${mealLabel}`,
        message: `Sva jela za ${weekdayLabel}, ${mealLabel} su blokirana. Razlog: ${blockAllReason.trim()}. Zamenite jela u jelovniku.`,
        priority: "important",
        targets: ["kitchen"],
        displayMode: "popup",
        actionHref: `/kuhinja/pregled-jelovnika`,
        actionLabel: "Otvori jelovnik",
      });

      toast.success(`${blockedCount} jela blokirano. Kuhinja je obaveštena.`);
    }

    setBlockAllTarget(null);
    setBlockAllReason("");
    setBlockedTick((t) => t + 1);
  }

  function handleUnblockAllConfirm() {
    if (!unblockAllTarget) return;

    const { dateKey, mealType } = unblockAllTarget;
    const blocked = getBlockedDishesForMeal(dateKey, mealType);

    for (const b of blocked) {
      unblockDish(b.id);
    }

    if (blocked.length > 0) {
      const weekdayIdx = weekDateKeys.indexOf(dateKey);
      const weekdayLabel = WEEKDAY_LABELS[weekdayIdx] ?? dateKey;
      const mealLabel = mealTypeLabels[mealType];

      void publishNotice({
        title: `Odblokirano ${blocked.length} jela: ${weekdayLabel} ${mealLabel}`,
        message: `Sva jela za ${weekdayLabel}, ${mealLabel} su odblokirana i ponovo dostupna.`,
        priority: "info",
        targets: ["kitchen"],
        displayMode: "popup",
        actionHref: `/kuhinja/pregled-jelovnika`,
        actionLabel: "Otvori jelovnik",
      });

      toast.success(`${blocked.length} jela odblokirano.`);
    }

    setUnblockAllTarget(null);
    setBlockedTick((t) => t + 1);
  }

  const monthNav = (
    <div className="flex items-center gap-2">
      <button
        className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-xs font-semibold text-[#5055D2] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#5055D2]/10"
        onClick={handleGoToday}
        type="button"
      >
        Danas
      </button>
      <div className="flex items-center gap-0.5 rounded-full border border-black/5 bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <button
          aria-label="Prethodna nedelja"
          className="flex size-8 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2]"
          onClick={handlePrevWeek}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <span className="min-w-[10rem] px-2 text-center text-sm font-bold text-[#5055D2] lg:min-w-[12rem] lg:text-base">
          {weekRangeLabel}
        </span>
        <button
          aria-label="Sledeća nedelja"
          className="flex size-8 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-[#EFF1F4] hover:text-[#5055D2]"
          onClick={handleNextWeek}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );

  function MealCellContent({ entry }: { entry: DailyMenuEntry | undefined }) {
    if (!entry) {
      return <p className="text-sm text-black/40">Nema jela</p>;
    }
    const hasDishes = entry.slots.some((slot) => slot.dishIds.length > 0);
    if (!hasDishes) {
      return <p className="text-sm text-black/40">Nema jela</p>;
    }
    return (
      <ul className="space-y-1.5">
        {kitchenSlotOrder.map((slotId) => {
          const slot = entry.slots.find((s) => s.slotId === slotId);
          const dishes = getDishesByIds(slot?.dishIds ?? []);
          if (dishes.length === 0) return null;
          return (
            <li
              className={`rounded-lg px-2.5 py-1.5 ${
                slotId === "main" ? "bg-[#5055D2]/10" : "bg-[#5055D2]/5"
              }`}
              key={slotId}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5055D2]">
                {kitchenSlotLabels[slotId]}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-black/85">
                {dishes.map((d) => d.name).join(", ")}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex items-start gap-5">
      <div className="min-w-0 flex-1">
        <StaffCard
          actions={monthNav}
          description="Nedeljni pregled jelovnika po danima"
          title="Pregled rasporeda"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-6 animate-spin rounded-full border-2 border-[#5055D2] border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="w-[110px] border border-black/10 bg-[#EFF1F4] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-black/55">
                      Obrok
                    </th>
                    {weekDateKeys.map((dateKey, idx) => {
                      const date = parseDateKey(dateKey);
                      const weekdayLabel = WEEKDAY_LABELS[idx];
                      return (
                        <th
                          className={`min-w-[120px] border border-black/10 px-3 py-2.5 ${
                            dateKey === todayKey
                              ? "bg-[#5055D2]/8"
                              : "bg-[#EFF1F4]"
                          }`}
                          key={dateKey}
                        >
                          <span className="block text-sm font-bold text-black">{weekdayLabel}</span>
                          <span className="mt-0.5 block text-xs font-normal text-black/45">
                            {date ? `${date.day}. ${date.month}.` : ""}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(["breakfast", "lunch", "dinner"] as MealType[]).map((mealType) => (
                    <tr key={mealType}>
                      <th className="border border-black/10 bg-[#EFF1F4]/60 px-3 py-3 align-top text-sm font-bold text-black">
                        {mealTypeLabels[mealType]}
                      </th>
                      {weekDateKeys.map((dateKey) => {
                        const entry = menuMap.get(`${dateKey}:${mealType}`);
                        const status = getDayMealStatus(entry);
                        return (
                          <td
                            className={`border border-black/10 px-3 py-3 align-top transition-colors ${
                              selectedCell?.dateKey === dateKey && selectedCell?.mealType === mealType
                                ? "bg-[#5055D2]/8"
                                : "cursor-pointer hover:bg-[#5055D2]/5"
                            }`}
                            key={dateKey}
                            onClick={() => setSelectedCell(
                              selectedCell?.dateKey === dateKey && selectedCell?.mealType === mealType
                                ? null
                                : { dateKey, mealType },
                            )}
                          >
                            <div className="mb-2 pointer-events-none">
                              <StaffBadge
                                label={statusLabel(status)}
                                variant={statusBadgeVariant(status)}
                              />
                            </div>
                            <MealCellContent entry={entry} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StaffCard>
      </div>

      {selectedDayMeals ? (
        <div className="w-80 shrink-0">
          <StaffCard
            description="Pregled kompletnog menija za izabrani obrok"
            padding="lg"
            title={formatCalendarDateLabel(selectedDayMeals.dateKey)}
          >
            <div className="space-y-3">
              {(["breakfast", "lunch", "dinner"] as MealType[]).map((mt) => {
                const entry = selectedDayMeals[mt];
                const status = getDayMealStatus(entry);
                if (status === "missing") return null;

                const blockedForMeal = getBlockedForMeal(selectedDayMeals.dateKey, mt);
                const blockedIds = new Set(blockedForMeal.map((b) => b.dishId));

                return (
                  <div
                    className={`rounded-xl border p-3.5 ${
                      status === "published"
                        ? "border-green-200 bg-green-50/40"
                        : "border-amber-200 bg-amber-50/40"
                    }`}
                    key={mt}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1F2937]">
                        {mealTypeLabels[mt]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <StaffBadge
                          label={statusLabel(status)}
                          variant={statusBadgeVariant(status)}
                        />
                        {entry && blockedForMeal.length === 0 ? (
                          <button
                            className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                            onClick={() => {
                              const allDishes = getDishesByIds(
                                entry.slots.flatMap((s) => s.dishIds),
                              );
                              setBlockAllTarget({
                                dateKey: selectedDayMeals.dateKey,
                                mealType: mt,
                                dishNames: allDishes.map((d) => d.name),
                              });
                            }}
                            title="Blokiraj sva jela za ovaj obrok"
                            type="button"
                          >
                            <Ban size={10} className="inline mr-0.5" />
                            Blokiraj sve
                          </button>
                        ) : null}
                        {entry && blockedForMeal.length > 0 ? (
                          <button
                            className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                            onClick={() => {
                              const allDishes = getDishesByIds(
                                entry.slots.flatMap((s) => s.dishIds),
                              );
                              setUnblockAllTarget({
                                dateKey: selectedDayMeals.dateKey,
                                mealType: mt,
                                dishNames: allDishes.map((d) => d.name),
                              });
                            }}
                            title="Odblokiraj sva jela za ovaj obrok"
                            type="button"
                          >
                            <CheckCircle size={10} className="inline mr-0.5" />
                            Odblokiraj sve ({blockedForMeal.length})
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {entry ? (
                      <div className="space-y-2">
                        {kitchenSlotOrder.map((slotId) => {
                          const slot = entry.slots.find((s) => s.slotId === slotId);
                          const dishes = getDishesByIds(slot?.dishIds ?? []);
                          if (dishes.length === 0) return null;
                          return (
                            <div key={slotId}>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5055D2]">
                                {kitchenSlotLabels[slotId]}
                              </p>
                              <ul className="mt-1 space-y-1">
                                {dishes.map((dish) => {
                                  const isBlocked = blockedIds.has(dish.id);
                                  const existingBlock = blockedForMeal.find((b) => b.dishId === dish.id);
                                  return (
                                    <li
                                      className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                                        isBlocked ? "bg-red-50 border border-red-200" : ""
                                      }`}
                                      key={dish.id}
                                    >
                                      <span className={`flex-1 ${isBlocked ? "text-red-700 line-through" : "text-black/85"}`}>
                                        {dish.name}
                                      </span>
                                      <button
                                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                                          isBlocked
                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                        }`}
                                        onClick={() =>
                                          setBlockTarget({
                                            dishId: dish.id,
                                            dishName: dish.name,
                                            dateKey: selectedDayMeals.dateKey,
                                            mealType: mt,
                                            existingBlock,
                                          })
                                        }
                                        title={isBlocked ? "Odblokiraj jelo" : "Blokiraj jelo"}
                                        type="button"
                                      >
                                        {isBlocked ? (
                                          <CheckCircle size={10} className="inline mr-0.5" />
                                        ) : (
                                          <Ban size={10} className="inline mr-0.5" />
                                        )}
                                        {isBlocked ? "Odblokiraj" : "Blokiraj"}
                                      </button>
                                      {isBlocked && existingBlock ? (
                                        <span className="max-w-[140px] truncate text-[10px] text-red-500" title={existingBlock.reason}>
                                          {existingBlock.reason}
                                        </span>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <MealCellContent entry={entry} />
                    )}
                  </div>
                );
              })}
            </div>
          </StaffCard>
        </div>
      ) : null}

      <BlockDishDialog
        open={blockTarget !== null}
        dishName={blockTarget?.dishName ?? ""}
        dateLabel={
          blockTarget
            ? WEEKDAY_LABELS[weekDateKeys.indexOf(blockTarget.dateKey)] ?? blockTarget.dateKey
            : ""
        }
        mealLabel={blockTarget ? mealTypeLabels[blockTarget.mealType] : ""}
        onConfirm={handleBlockConfirm}
        onCancel={() => setBlockTarget(null)}
      />

      {blockAllTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setBlockAllTarget(null); setBlockAllReason(""); }} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <Ban className="text-red-600" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">Blokirati sva jela?</p>
                <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                  Sva jela za{" "}
                  <span className="font-semibold">
                    {WEEKDAY_LABELS[weekDateKeys.indexOf(blockAllTarget.dateKey)] ?? blockAllTarget.dateKey}
                  </span>
                  ,{" "}
                  <span className="font-semibold">{mealTypeLabels[blockAllTarget.mealType]}</span>{" "}
                  biće blokirana. Kuhinja će dobiti obaveštenje da zameni sva jela.
                </p>
                {blockAllTarget.dishNames.length > 0 ? (
                  <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs text-[var(--text-secondary)]">
                    {blockAllTarget.dishNames.map((name) => (
                      <li key={name} className="flex items-center gap-1">
                        <Ban size={8} className="shrink-0 text-red-400" />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45">
                Razlog blokade *
              </label>
              <textarea
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/20 min-h-[80px] resize-y"
                onChange={(e) => setBlockAllReason(e.target.value)}
                placeholder="Npr. Jela nisu spremljena na vreme, problem sa nabavkom..."
                value={blockAllReason}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-black/5"
                onClick={() => { setBlockAllTarget(null); setBlockAllReason(""); }}
                type="button"
              >
                Otkaži
              </button>
              <button
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                disabled={!blockAllReason.trim()}
                onClick={handleBlockAllConfirm}
                type="button"
              >
                Blokiraj sve
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {unblockAllTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setUnblockAllTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle className="text-emerald-600" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">Odblokirati sva jela?</p>
                <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                  Sva blokirana jela za{" "}
                  <span className="font-semibold">
                    {WEEKDAY_LABELS[weekDateKeys.indexOf(unblockAllTarget.dateKey)] ?? unblockAllTarget.dateKey}
                  </span>
                  ,{" "}
                  <span className="font-semibold">{mealTypeLabels[unblockAllTarget.mealType]}</span>{" "}
                  biće odblokirana i ponovo dostupna u jelovniku.
                </p>
                {unblockAllTarget.dishNames.length > 0 ? (
                  <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs text-[var(--text-secondary)]">
                    {unblockAllTarget.dishNames.map((name) => (
                      <li key={name} className="flex items-center gap-1">
                        <CheckCircle size={8} className="shrink-0 text-emerald-400" />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-black/5"
                onClick={() => setUnblockAllTarget(null)}
                type="button"
              >
                Otkaži
              </button>
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                onClick={handleUnblockAllConfirm}
                type="button"
              >
                Odblokiraj sve
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
