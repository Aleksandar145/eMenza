"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, Send } from "lucide-react";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { StaffConfirmDialog } from "@/components/staff/StaffConfirmDialog";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { useKitchenWeekSelection } from "@/hooks/useKitchenWeekSelection";
import { useKuhinjaJelovnik } from "@/hooks/useKuhinjaJelovnik";
import { useToast } from "@/components/shared/toast/useToast";
import { KitchenMenuAlertsBanner } from "@/components/kuhinja/KitchenMenuAlertsBanner";
import { KitchenMenuDayCompact } from "@/components/kuhinja/KitchenMenuDayCompact";
import { KitchenMenuWeekStrip } from "@/components/kuhinja/KitchenMenuWeekStrip";
import { isKitchenMenuDataReady } from "@/lib/kitchen-data-ready";
import { getWeekDayKeys, getMenuMealStatus } from "@/lib/kuhinja-menu-overview";
import { publishScheduleMenus, getDailyMenu } from "@/lib/kuhinja-jelovnik-store";
import { canEditKitchenMenu, normalizeKitchenStaffRole } from "@/lib/kuhinja-roles";
import type { DailyMenuSlot } from "@/lib/kuhinja-mock";
import type { MealType } from "@/lib/meal-types";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];

const cardClass =
  "rounded-[20px] border border-black/5 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]";

export function KitchenMenuOverviewPage() {
  useKuhinjaJelovnik();
  useDishCatalog();
  const { session } = useKuhinjaSessionContext();
  const canEditMenu = canEditKitchenMenu(normalizeKitchenStaffRole(session?.role));
  const { selectedDateKey, weekStartDateKey, weekStripProps } = useKitchenWeekSelection();
  const toast = useToast();

  const isDataReady = isKitchenMenuDataReady();

  const [publishAllOpen, setPublishAllOpen] = useState(false);
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  function collectDraftMealsForWeek(): Array<{ dateKey: string; mealType: MealType; slots: DailyMenuSlot[] }> {
    const dayKeys = getWeekDayKeys(weekStartDateKey);
    const meals: Array<{ dateKey: string; mealType: MealType; slots: DailyMenuSlot[] }> = [];

    for (const dateKey of dayKeys) {
      for (const mealType of mealTypes) {
        const status = getMenuMealStatus(dateKey, mealType);
        if (status === "draft" || status === "draft_unsaved") {
          const menu = getDailyMenu(dateKey, mealType);
          if (menu) {
            meals.push({ dateKey, mealType, slots: menu.slots });
          }
        }
      }
    }

    return meals;
  }

  async function handlePublishAll() {
    setPublishAllOpen(false);
    setIsPublishingAll(true);
    try {
      const meals = collectDraftMealsForWeek();
      if (meals.length === 0) {
        toast.info("Nema obroka za objavu.");
        return;
      }
      await publishScheduleMenus(meals);
      toast.success(`Objavljeno ${meals.length} obroka za nedelju.`);
    } catch {
      toast.error("Greška pri objavi obroka.");
    } finally {
      setIsPublishingAll(false);
    }
  }

  const draftCount = collectDraftMealsForWeek().length;

  return (
    <div className="space-y-5">
      {!isDataReady ? (
        <div className={`p-5 text-sm text-black/55 ${cardClass}`}>Učitavam jelovnik i katalog…</div>
      ) : null}

      {canEditMenu ? <KitchenMenuAlertsBanner /> : null}

      <div className={`flex flex-wrap items-center justify-between gap-3 p-4 ${cardClass}`}>
        <p className="text-sm text-black/55">Pregledajte i odštampajte nedeljni jelovnik u tabeli.</p>
        <div className="flex items-center gap-2">
          {canEditMenu && draftCount > 0 ? (
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4045B2] disabled:opacity-60"
              disabled={isPublishingAll}
              onClick={() => setPublishAllOpen(true)}
              type="button"
            >
              <Send aria-hidden="true" size={14} />
              {isPublishingAll ? "Objavljujem…" : `Objavi sve (${draftCount})`}
            </button>
          ) : null}
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5"
            href={`/kuhinja/nedeljni-raspored?week=${encodeURIComponent(weekStartDateKey)}`}
          >
            <CalendarRange aria-hidden="true" size={16} />
            Pregledaj preko nedeljnog rasporeda
          </Link>
        </div>
      </div>

      <KitchenMenuWeekStrip title="Pregled nedelje" {...weekStripProps} />
      <KitchenMenuDayCompact dateKey={selectedDateKey} />

      <StaffConfirmDialog
        open={publishAllOpen}
        title="Objavi sve obroke za nedelju?"
        message={`Svi nacrt obroci (${draftCount}) za ovu nedelju biće objavljeni. Nastaviti?`}
        confirmLabel={isPublishingAll ? "Objavljujem…" : "Objavi sve"}
        onConfirm={() => void handlePublishAll()}
        onCancel={() => setPublishAllOpen(false)}
      />
    </div>
  );
}

export default KitchenMenuOverviewPage;
