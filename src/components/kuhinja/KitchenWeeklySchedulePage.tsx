"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardCopy, Copy, Lock, Printer, Upload } from "lucide-react";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { KitchenMenuWeekStrip } from "@/components/kuhinja/KitchenMenuWeekStrip";
import { KitchenWeeklyScheduleGrid } from "@/components/kuhinja/KitchenWeeklyScheduleGrid";
import { StaffConfirmDialog } from "@/components/staff/StaffConfirmDialog";
import { useToast } from "@/components/shared/toast/useToast";
import { ApiError } from "@/lib/api/client";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { useKitchenWeekSelection } from "@/hooks/useKitchenWeekSelection";
import { useKuhinjaJelovnik } from "@/hooks/useKuhinjaJelovnik";
import { useWeeklySchedule } from "@/hooks/useWeeklySchedule";
import { isKitchenMenuDataReady } from "@/lib/kitchen-data-ready";
import { ensureJelovnikRangeLoaded, subscribeKuhinjaJelovnik } from "@/lib/kuhinja-jelovnik-store";
import { loadWeeklySchedule } from "@/lib/kuhinja-weekly-schedule-store";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { formatWeekRangeLabel, getWeekStartForDate, parseKitchenMenuDateParam, shiftWeekStart } from "@/lib/kuhinja-menu-overview";
import type { DailyMenuSlot } from "@/lib/kuhinja-mock";
import {
  applyWeeklyScheduleToJelovnik,
  buildWeeklyScheduleFromJelovnik,
  collectPublishTasks,
  copyScheduleDayFromPreviousWeek,
  copyWeeklyScheduleFromPreviousWeek,
  finalizeScheduleAfterApply,
  mergeScheduleWithJelovnik,
  scheduleHasPublishedTargets,
  updateScheduleMeal,
} from "@/lib/kuhinja-weekly-schedule";
import type { MealType } from "@/lib/meal-types";
import { canEditKitchenWeeklySchedule, normalizeKitchenStaffRole } from "@/lib/kuhinja-roles";

const cardClass =
  "rounded-[20px] border border-black/5 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]";

function formatPrintedAt() {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function KitchenWeeklySchedulePage() {
  useKuhinjaJelovnik();
  useDishCatalog();
  const { session } = useKuhinjaSessionContext();
  const staffRole = normalizeKitchenStaffRole(session?.role);
  const canEdit = canEditKitchenWeeklySchedule(staffRole);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const initialWeekDateKey = parseKitchenMenuDateParam(weekParam);

  const syncWeekUrl = useCallback(
    (nextWeekStart: string) => {
      const params = new URLSearchParams();
      params.set("week", nextWeekStart);
      router.replace(`/kuhinja/nedeljni-raspored?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const {
    todayDateKey,
    weekStartDateKey,
    setSelectedDateKey,
    setWeekStartDateKey,
    weekStripProps,
  } = useKitchenWeekSelection({
    initialDateKey: initialWeekDateKey,
    onWeekStartChange: syncWeekUrl,
  });

  const { schedule, setSchedule } = useWeeklySchedule(weekStartDateKey);
  const [isApplying, setIsApplying] = useState(false);
  const isApplyingRef = useRef(false);
  const initializedWeekKeyRef = useRef<string | null>(null);
  const isDataReady = isKitchenMenuDataReady();
  const [copyWeekConfirmOpen, setCopyWeekConfirmOpen] = useState(false);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [applyHasPublished, setApplyHasPublished] = useState(false);
  const [copyDayTarget, setCopyDayTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!weekParam) {
      return;
    }

    const parsed = parseKitchenMenuDateParam(weekParam);
    const nextWeekStart = getWeekStartForDate(parsed, todayDateKey);
    setSelectedDateKey(parsed);
    setWeekStartDateKey(nextWeekStart);
  }, [weekParam, todayDateKey, setSelectedDateKey, setWeekStartDateKey]);

  useEffect(() => {
    if (!isDataReady || isApplyingRef.current) {
      return;
    }

    const isNewWeek = initializedWeekKeyRef.current !== weekStartDateKey;
    if (isNewWeek) {
      initializedWeekKeyRef.current = weekStartDateKey;
      const saved = loadWeeklySchedule(weekStartDateKey);
      if (saved) {
        setSchedule(mergeScheduleWithJelovnik(saved));
      } else {
        setSchedule(buildWeeklyScheduleFromJelovnik(weekStartDateKey));
      }
    }

    void ensureJelovnikRangeLoaded(weekStartDateKey).then(() => {
      if (isApplyingRef.current) {
        return;
      }

      setSchedule((current) => {
        if (!current || current.weekStartDateKey !== weekStartDateKey) {
          return current;
        }

        return mergeScheduleWithJelovnik(current);
      });
    });
  }, [isDataReady, setSchedule, weekStartDateKey]);

  useEffect(() => {
    return subscribeKuhinjaJelovnik(() => {
      if (isApplyingRef.current) {
        return;
      }

      setSchedule((current) => (current ? mergeScheduleWithJelovnik(current) : current));
    });
  }, [setSchedule]);

  function handleCopyPreviousWeek() {
    setCopyWeekConfirmOpen(true);
  }

  function confirmCopyPreviousWeek() {
    setCopyWeekConfirmOpen(false);
    const previousWeekStart = shiftWeekStart(weekStartDateKey, -1);
    void ensureJelovnikRangeLoaded(previousWeekStart).then(() => {
      setSchedule(copyWeeklyScheduleFromPreviousWeek(weekStartDateKey));
      toast.success("Raspored kopiran sa prošle nedelje");
    });
  }

  function handleCopyDayFromPreviousWeek(dateKey: string) {
    setCopyDayTarget(dateKey);
  }

  function confirmCopyDay() {
    if (!copyDayTarget || !schedule) return;
    const targetDateKey = copyDayTarget;
    setCopyDayTarget(null);
    const previousWeekStart = shiftWeekStart(weekStartDateKey, -1);
    void ensureJelovnikRangeLoaded(previousWeekStart).then(() => {
      setSchedule(copyScheduleDayFromPreviousWeek(schedule, targetDateKey));
      toast.success("Dan kopiran sa prošle nedelje");
    });
  }

  async function handleApply() {
    if (!schedule || isApplying) {
      return;
    }

    const publishTasks = collectPublishTasks(schedule);
    if (publishTasks.length === 0) {
      toast.info("Nema neprimijenjenih izmena za ovu nedelju.");
      return;
    }

    setApplyHasPublished(scheduleHasPublishedTargets(schedule));
    setApplyConfirmOpen(true);
  }

  async function confirmApply() {
    if (!schedule || isApplying) {
      setApplyConfirmOpen(false);
      return;
    }

    setApplyConfirmOpen(false);
    isApplyingRef.current = true;
    setIsApplying(true);
    try {
      await applyWeeklyScheduleToJelovnik(schedule);
      setSchedule(mergeScheduleWithJelovnik(finalizeScheduleAfterApply(schedule)));
      toast.success("Raspored primenjen i objavljen na nedelju");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 401
            ? "Sesija je istekla. Prijavite se ponovo na /kuhinja/login (npr. kuhinja@emenza.rs)."
            : error.status === 403
              ? "Nemate dozvolu za objavu menija. Prijavite se na /kuhinja/login ili se odjavite sa studentskog naloga u drugom tabu."
            : error.status === 408
              ? "Objava traje predugo. Proverite konekciju i pokušajte ponovo."
              : error.message
          : "Primena rasporeda nije uspela.";
      toast.error(message);
      setSchedule((current) => (current ? mergeScheduleWithJelovnik(current) : current));
    } finally {
      isApplyingRef.current = false;
      setIsApplying(false);
    }
  }

  function handleUpdateMeal(dateKey: string, mealType: MealType, slots: DailyMenuSlot[]) {
    setSchedule((current) => {
      if (!current) {
        return current;
      }

      return updateScheduleMeal(current, dateKey, mealType, slots);
    });
  }

  return (
    <div className="weekly-schedule-print space-y-5">
      {!isDataReady ? (
        <div className={`p-5 text-sm text-black/55 ${cardClass}`}>Učitavam jelovnik i katalog…</div>
      ) : null}

      {!canEdit ? (
        <div className={`flex items-start gap-3 p-4 text-sm text-black/70 ${cardClass}`}>
          <Lock aria-hidden="true" className="mt-0.5 shrink-0 text-[#5055D2]" size={18} />
          <p>
            Pregledate raspored u režimu <span className="font-semibold text-black">samo za čitanje</span>.
            Uređivanje je dostupno kuvaru i moderatoru.
          </p>
        </div>
      ) : null}

      <div className="print:hidden">
        <KitchenMenuWeekStrip schedule={schedule} title="Nedeljni raspored" {...weekStripProps} />
      </div>

      <section className={`print:hidden ${cardClass}`}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-4 lg:px-5">
          {canEdit ? (
            <>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-black hover:bg-black/5 disabled:opacity-60"
                disabled={!isDataReady}
                onClick={handleCopyPreviousWeek}
                type="button"
              >
                <Copy aria-hidden="true" size={16} />
                Kopiraj prošlu nedelju
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-black hover:bg-black/5 disabled:opacity-60"
                disabled={!schedule || !isDataReady || isApplying}
                onClick={() => void handleApply()}
                type="button"
              >
                <Upload aria-hidden="true" size={16} />
                {isApplying ? "Primenjujem…" : "Primeni na nedelju"}
              </button>
            </>
          ) : null}
          <button
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-black hover:bg-black/5 disabled:opacity-60"
            disabled={!schedule}
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" size={16} />
            Štampaj
          </button>
          <Link
            className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold text-black hover:bg-black/5"
            href={`/kuhinja/jelovnik?date=${encodeURIComponent(weekStripProps.selectedDateKey)}&obrok=lunch`}
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Vrati se na Jelovnik
          </Link>
        </div>
      </section>

      <header className="hidden border-b border-black/10 pb-4 print:block">
        <h2 className="text-xl font-bold text-black">Nedeljni raspored jelovnika</h2>
        <p className="mt-1 text-sm text-black/70">{formatWeekRangeLabel(weekStartDateKey)}</p>
        <p className="mt-1 text-xs text-black/55">Štampano: {formatPrintedAt()}</p>
      </header>

      {schedule && isDataReady ? (
        <section className={`p-4 lg:p-5 print:border-0 print:p-0 print:shadow-none ${cardClass}`}>
          <KitchenWeeklyScheduleGrid
            onUpdateMeal={handleUpdateMeal}
            onCopyDay={canEdit ? handleCopyDayFromPreviousWeek : undefined}
            readOnly={!canEdit}
            schedule={schedule}
          />
        </section>
      ) : !isDataReady ? null : (
        <section className={`p-8 text-center print:hidden ${cardClass}`}>
          <p className="text-sm text-black/55">Za izabranu nedelju još nema učitanog jelovnika.</p>
        </section>
      )}

      <StaffConfirmDialog
        open={copyWeekConfirmOpen}
        title="Kopiraj prošlu nedelju?"
        message="Trenutni sadržaj ove nedelje biće zamenjen rasporedom sa prošle nedelje."
        confirmLabel="Kopiraj nedelju"
        onConfirm={confirmCopyPreviousWeek}
        onCancel={() => setCopyWeekConfirmOpen(false)}
      />

      <StaffConfirmDialog
        open={copyDayTarget !== null}
        title="Kopiraj dan sa prošle nedelje?"
        message={`Sva tri obroka za ${copyDayTarget ? formatCalendarDayLabel(copyDayTarget) : ""} biće zamenjena.`}
        confirmLabel="Kopiraj dan"
        onConfirm={confirmCopyDay}
        onCancel={() => setCopyDayTarget(null)}
      />

      <StaffConfirmDialog
        open={applyConfirmOpen}
        title={applyHasPublished ? "Prepisati objavljen meni?" : "Primeniti raspored?"}
        message={
          applyHasPublished
            ? "Neki dani imaju objavljen meni. Primena će prepisati nacrt menija za celu nedelju (7 dana × 3 obroka) i objaviti obroke sa jelima. Nastaviti?"
            : "Primena će upisati raspored za celu nedelju (7 dana × 3 obroka) i objaviti obroke sa jelima. Nastaviti?"
        }
        confirmLabel={isApplying ? "Primenjujem…" : "Primeni"}
        variant={applyHasPublished ? "danger" : "warning"}
        onConfirm={() => void confirmApply()}
        onCancel={() => setApplyConfirmOpen(false)}
      />
    </div>
  );
}

export default KitchenWeeklySchedulePage;
