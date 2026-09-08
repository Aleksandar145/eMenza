"use client";

import Link from "next/link";
import { CalendarOff, ChevronRight, Clock, QrCode, Sparkles, XCircle } from "lucide-react";
import { MealStatusBadge } from "@/components/dashboard/MealStatusBadge";
import { PickupAtCounterPanel } from "@/components/preuzimanje/PickupAtCounterPanel";
import { PosnoBadge } from "@/components/shared/PosnoBadge";
import { LiturgicalDayLabel } from "@/components/shared/LiturgicalDayLabel";
import { PonetiBadge } from "@/components/shared/PonetiBadge";
import { ReservationBookByCountdown } from "@/components/shared/ReservationBookByCountdown";
import {
  canCancelMealReservation,
  formatCalendarDayLabel,
  getMealDetailsForDay,
  getMealPickupWindow,
  getPosnoMenuPreview,
  isDayAvailableForReservation,
  mealPickupModeLabels,
  type MealReservationStatus,
  type MealType,
} from "@/lib/dashboard-mock";
import {
  canBookMealSlot,
  canShowAiPreporuka,
  mealBookingWindowPassedMessage,
  shouldShowBookingPassedMessage,
} from "@/lib/meal-booking-window";
import {
  buildMealDetailsForDay,
  canCancelApiReservation,
  findApiReservation,
  formatRefundRsd,
  reservationToPickupOrder,
} from "@/lib/reservations-view";
import type { ReservationRecord } from "@/server/repositories/reservations";
import { getLiturgicalDisplayInfo, shouldShowPosnoMealsForDate } from "@/lib/fasting-preferences";
import { getClosedDateEntryForDate, getReservationAdvanceDaysLabel } from "@/lib/admin-system-store";
import type { UserReligion } from "@/lib/user-preferences";
import type { FastingPreferences } from "@/lib/fasting-preferences";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useHydrationSafeDateAnchor } from "@/hooks/useHydrationSafeDateAnchor";
import { useT } from "@/i18n/useT";
import { compareDateKeys } from "@/lib/calendar-utils";
import {
  getPickupOrderForMeal,
  getPreuzimanjeHref,
  isMealReadyForPickup,
} from "@/lib/preuzimanje-mock";

type DayMealPlannerProps = {
  selectedDateKey: string;
  activeMealTab: MealType;
  onMealTabChange: (mealType: MealType) => void;
  onReserve: (mealType?: MealType) => void;
  onAiRecommend?: () => void;
  onCancel?: (mealType: MealType) => void;
  refundRsd?: number;
  religion?: UserReligion | "";
  fasting?: FastingPreferences;
  className?: string;
  apiReservations?: ReservationRecord[];
  pickupContext?: {
    studentName: string;
    cardId: string;
    cardDisplayNumber: string;
  };
};

const mealTabs: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Doručak" },
  { type: "lunch", label: "Ručak" },
  { type: "dinner", label: "Večera" },
];

const columnHeaders = ["Glavno jelo", "Dodatak", "Salata", "Dezert"] as const;
const columnKeys = ["glavnoJelo", "dodatak", "salata", "obrok"] as const;

const statusDotClass: Record<MealReservationStatus, string> = {
  aktivno: "bg-[#5055D2]",
  zakazano: "bg-black/30",
  iskorisceno: "bg-[#55de9a]",
  propusteno: "bg-red-400",
  nerezervisano: "bg-black/15",
};

export function DayMealPlanner({
  selectedDateKey,
  activeMealTab,
  onMealTabChange,
  onReserve,
  onAiRecommend,
  onCancel,
  refundRsd = 0,
  religion = "",
  fasting,
  className = "",
  apiReservations,
  pickupContext,
}: DayMealPlannerProps) {
  useAdminSystem();
  const { t } = useT();
  const { dateKey: anchorDateKey } = useHydrationSafeDateAnchor();
  const reservationAdvanceLabel = getReservationAdvanceDaysLabel();
  const isPastDate = compareDateKeys(selectedDateKey, anchorDateKey) < 0;
  const useApiView = apiReservations !== undefined;
  const { dateLabel, sections } = useApiView
    ? buildMealDetailsForDay(selectedDateKey, apiReservations)
    : getMealDetailsForDay(selectedDateKey);
  const isReservationAvailable = isDayAvailableForReservation(selectedDateKey, anchorDateKey);
  const closedEntry = !isReservationAvailable ? getClosedDateEntryForDate(selectedDateKey) : undefined;
  const showPosnoMeals = fasting
    ? shouldShowPosnoMealsForDate(religion, selectedDateKey, fasting)
    : false;
  const liturgicalInfo = showPosnoMeals && fasting
    ? getLiturgicalDisplayInfo(religion, selectedDateKey, fasting)
    : null;
  const activeSection = sections.find((section) => section.type === activeMealTab) ?? sections[0];
  const pickupWindow = getMealPickupWindow(selectedDateKey, activeSection.type);

  const mealReadyForPickup = isMealReadyForPickup(
    selectedDateKey,
    activeSection.type,
    activeSection.status,
  );

  const activeApiReservation =
    useApiView && mealReadyForPickup
      ? findApiReservation(selectedDateKey, activeSection.type, apiReservations)
      : null;

  const pickupOrder = mealReadyForPickup
    ? activeApiReservation && pickupContext
      ? reservationToPickupOrder(activeApiReservation, pickupContext)
      : getPickupOrderForMeal(selectedDateKey, activeSection.type)
    : null;

  const canBookActiveSlot =
    isReservationAvailable &&
    canBookMealSlot(selectedDateKey, activeSection.type, activeSection.status);
  const activeSlotPassed = shouldShowBookingPassedMessage(
    selectedDateKey,
    activeSection.type,
    activeSection.status,
  );
  const showQrFooter = mealReadyForPickup;
  const showCancelFooter =
    (useApiView
      ? canCancelApiReservation(selectedDateKey, activeSection.type, apiReservations)
      : canCancelMealReservation(selectedDateKey, activeSection.type)) && onCancel;
  const showAiRecommend =
    isReservationAvailable &&
    canShowAiPreporuka(selectedDateKey, activeSection.type) &&
    Boolean(onAiRecommend);
  const showFooter = showQrFooter || showCancelFooter;
  const posnoPreview =
    showPosnoMeals &&
    activeSection.status === "nerezervisano" &&
    activeSection.posnoMenuAvailable
      ? getPosnoMenuPreview(activeSection.type)
      : null;
  const showPosnoBadge = showPosnoMeals && (activeSection.isPosno || Boolean(posnoPreview));
  const showPonetiBadge = activeSection.pickupMode === "poneti";

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div className="border-b border-black/5 px-4 py-4 lg:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-black lg:text-xl">Obroci za dan</h2>
            <p className="mt-0.5 text-sm font-light text-black/55">
              {dateLabel} · izaberite obrok
            </p>
          </div>
          {showPosnoMeals ? (
            <LiturgicalDayLabel
              className="shrink-0 max-w-[45%] text-right text-xs font-medium leading-snug text-[#b45309] lg:max-w-none lg:text-sm"
              label={liturgicalInfo?.label}
            />
          ) : null}
        </div>

        <nav aria-label="Obroci" className="mt-4 -mx-1 overflow-x-auto px-1 pb-1">
          <div className="inline-flex min-w-full gap-1 rounded-full border border-black/5 bg-[#EFF1F4]/60 p-1 sm:min-w-0">
            {mealTabs.map((tab) => {
              const section = sections.find((entry) => entry.type === tab.type);
              const isActive = activeMealTab === tab.type;
              const status = section?.status ?? "nerezervisano";
              const tabPassed = shouldShowBookingPassedMessage(
                selectedDateKey,
                tab.type,
                status,
              );
              const tabPickupWindow = getMealPickupWindow(selectedDateKey, tab.type);

              const tabCanBook =
                isReservationAvailable &&
                canBookMealSlot(selectedDateKey, tab.type, status);

              return (
                <button
                  aria-current={isActive ? "true" : undefined}
                  className={`flex shrink-0 flex-col items-start rounded-full px-3 py-1.5 text-left transition-colors lg:px-4 lg:py-2 ${
                    isActive
                      ? "bg-[#5055D2] text-white shadow-sm"
                      : tabPassed
                        ? "text-black/35 opacity-70"
                        : "text-black/55 hover:text-[#5055D2]"
                  }`}
                  key={tab.type}
                  onClick={() => onMealTabChange(tab.type)}
                  type="button"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 shrink-0 rounded-full ${isActive ? "bg-white/80" : statusDotClass[status]}`}
                    />
                    <span className="text-xs font-semibold lg:text-sm">{tab.label}</span>
                  </span>
                  {tabCanBook ? (
                    <ReservationBookByCountdown
                      className={isActive ? "!text-white/80" : ""}
                      dateKey={selectedDateKey}
                      mealType={tab.type}
                      status={status}
                      variant="compact"
                    />
                  ) : tabPickupWindow ? (
                    <span
                      className={`mt-0.5 pl-3 text-[10px] font-medium tabular-nums lg:text-xs ${
                        isActive ? "text-white/75" : "text-black/40"
                      }`}
                    >
                      {tabPickupWindow}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="flex flex-1 flex-col px-4 py-4 lg:px-5">
        {!isReservationAvailable ? (
          <div className="mb-4 rounded-2xl border border-dashed border-black/12 bg-[#EFF1F4]/60 px-4 py-4 text-center">
            {isPastDate ? (
              <p className="text-sm font-semibold text-black">{t("reservations.historyDayHint")}</p>
            ) : closedEntry ? (
              <>
                <p className="text-sm font-semibold text-black">
                  Menza ne radi: {closedEntry.reason}
                </p>
                <p className="mt-1 text-xs font-light text-black/55">
                  Hranu možete rezervisati samo {reservationAdvanceLabel}.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-black">
                  Rezervacija nije dostupna za ovaj datum
                </p>
                <p className="mt-1 text-xs font-light text-black/55">
                  Hranu možete rezervisati samo {reservationAdvanceLabel}.
                </p>
              </>
            )}
          </div>
        ) : null}

        <div
          className={`rounded-2xl border p-4 ${
            activeSection.status === "aktivno"
              ? "border-[#5055D2]/25 ring-1 ring-[#5055D2]/15"
              : activeSection.status === "nerezervisano"
                ? "border-dashed border-black/12 bg-[#EFF1F4]/40"
                : "border-black/5 bg-[#EFF1F4]/50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-base font-bold text-black lg:text-lg">{activeSection.title}</h3>
              {showPosnoBadge ? <PosnoBadge size="md" /> : null}
              {showPonetiBadge ? <PonetiBadge size="md" /> : null}
              {pickupWindow ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums text-black/50">
                  <Clock aria-hidden="true" size={14} />
                  {pickupWindow}
                </span>
              ) : null}
            </div>
            <MealStatusBadge status={activeSection.status} />
          </div>

          {showPonetiBadge && activeSection.status !== "nerezervisano" ? (
            <p className="mt-2 text-xs font-medium text-[#5055D2]">
              {mealPickupModeLabels.poneti}
            </p>
          ) : null}

          {activeSection.status === "nerezervisano" ? (
            <div className="mt-4 flex flex-col items-center rounded-xl bg-white/60 px-4 py-5 text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-[#EFF1F4]">
                <CalendarOff aria-hidden="true" className="text-black/35" size={22} />
              </div>
              <p className="text-sm font-medium text-black/65">
                Niste rezervisali {activeSection.title.toLowerCase()} za {formatCalendarDayLabel(selectedDateKey)}.
              </p>
              {posnoPreview ? (
                <div className="mt-4 w-full rounded-xl bg-[#2f8f55]/8 px-3 py-3 text-left ring-1 ring-[#2f8f55]/15">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#2f8f55]">
                    Dostupan posni meni
                  </p>
                  <p className="text-sm font-medium text-black">{posnoPreview.glavnoJelo}</p>
                  <p className="mt-1 text-xs text-black/55">
                    {posnoPreview.dodatak} · {posnoPreview.salata} · {posnoPreview.obrok}
                  </p>
                </div>
              ) : null}
              {canBookActiveSlot ? (
                <>
                  <ReservationBookByCountdown
                    className="mt-4"
                    dateKey={selectedDateKey}
                    mealType={activeSection.type}
                    status={activeSection.status}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      className="rounded-full border-2 border-[#5055D2] bg-white px-4 py-2 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5"
                      onClick={() => onReserve(activeSection.type)}
                      type="button"
                    >
                      {posnoPreview ? "Rezerviši posno" : `Rezerviši ${activeSection.title.toLowerCase()}`}
                    </button>
                    {showAiRecommend ? (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#5055D2]/25 bg-[#5055D2]/5 px-4 py-2 text-sm font-semibold text-[#5055D2] transition-colors hover:border-[#5055D2]/40 hover:bg-[#5055D2]/10"
                        onClick={onAiRecommend}
                        type="button"
                      >
                        <Sparkles aria-hidden="true" size={16} />
                        AI preporuka
                      </button>
                    ) : null}
                  </div>
                </>
              ) : activeSlotPassed && isReservationAvailable ? (
                <p className="mt-4 text-sm font-medium text-black/50">{mealBookingWindowPassedMessage}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {columnHeaders.map((header, colIndex) => (
                  <div
                    className={`rounded-xl px-2 py-2.5 text-center ${
                      showPosnoBadge ? "bg-[#2f8f55]/8 ring-1 ring-[#2f8f55]/15" : "bg-white/70"
                    }`}
                    key={header}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">
                      {header}
                    </p>
                    <p className="mt-1 text-sm font-medium text-black">
                      {activeSection.items?.[columnKeys[colIndex]]}
                    </p>
                  </div>
                ))}
              </div>
              {pickupOrder ? <PickupAtCounterPanel order={pickupOrder} /> : null}
            </>
          )}
        </div>
      </div>

      {showFooter ? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-black/5 px-4 py-3 lg:px-5">
          {showQrFooter ? (
            <Link
              className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-[0_4px_14px_rgba(80,85,210,0.22)] transition-all hover:shadow-[0_6px_18px_rgba(80,85,210,0.32)] active:scale-[0.99]"
              href={getPreuzimanjeHref({
                dateKey: selectedDateKey,
                obrok: activeSection.type,
              })}
              style={{
                backgroundImage:
                  "linear-gradient(95deg, #5055D2 0%, #6368e0 50%, #9093E1 100%)",
              }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <QrCode aria-hidden="true" className="text-white" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white lg:text-base">
                  QR preuzimanje
                </span>
                <span className="block text-xs font-medium text-white/75">
                  Pokažite kod na šalteru · {pickupWindow}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5"
                size={18}
              />
            </Link>
          ) : null}

          {showCancelFooter ? (
            <button
              className="group flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left transition-all hover:border-red-300 hover:bg-red-100/80 active:scale-[0.99]"
              onClick={() => onCancel(activeSection.type)}
              type="button"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white">
                <XCircle aria-hidden="true" className="text-red-500" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-red-600 lg:text-base">
                  Otkaži rezervaciju
                </span>
                <span className="block text-xs font-light text-red-600/70">
                  Novac se vraća na karticu · najkasnije 24h pre serviranja
                </span>
                {refundRsd > 0 ? (
                  <span className="mt-0.5 block text-xs font-semibold tabular-nums text-red-600/85">
                    Povrat: {formatRefundRsd(refundRsd)} RSD
                  </span>
                ) : null}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="shrink-0 text-red-400 transition-transform group-hover:translate-x-0.5"
                size={18}
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default DayMealPlanner;
