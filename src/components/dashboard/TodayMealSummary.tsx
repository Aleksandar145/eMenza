"use client";

import Link from "next/link";
import { ArrowRight, Clock, QrCode, UtensilsCrossed } from "lucide-react";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { MealStatusBadge } from "@/components/dashboard/MealStatusBadge";
import { CounterQueueBadge } from "@/components/shared/CounterQueueBadge";
import { PosnoBadge } from "@/components/shared/PosnoBadge";
import { ReservationBookByCountdown } from "@/components/shared/ReservationBookByCountdown";
import {
  getMealPickupWindow,
  getPosnoMenuPreview,
} from "@/lib/dashboard-mock";
import {
  canBookMealSlot,
  mealBookingWindowPassedMessage,
  shouldShowBookingPassedMessage,
} from "@/lib/meal-booking-window";
import { isWithinPickupWindow } from "@/lib/meal-pickup-window";
import { getWorkingHours } from "@/lib/admin-system-store";
import { getKreatorObrokaHref } from "@/lib/kreator-obroka-mock";
import { useTodayMealView } from "@/hooks/useTodayMealView";
import { getPreuzimanjeHref } from "@/lib/preuzimanje-mock";
import { getRezervacijeHref } from "@/lib/rezervacije-mock";

type TodayMealSummaryProps = {
  className?: string;
  showPosnoMeals?: boolean;
};

const columnHeaders = ["Glavno jelo", "Dodatak", "Salata", "Dezert"] as const;
const columnKeys = ["glavnoJelo", "dodatak", "salata", "obrok"] as const;

export function TodayMealSummary({
  className = "",
  showPosnoMeals = false,
}: TodayMealSummaryProps) {
  const todayDateKey = useTodayDateKey();
  const primary = useTodayMealView(todayDateKey);
  const { section, dateLabel, heroType } = primary;
  const workingHours = getWorkingHours();
  const isActiveMeal =
    heroType === "active" ||
    isWithinPickupWindow(todayDateKey, section.type, workingHours);
  const pickupWindow = getMealPickupWindow(todayDateKey, section.type);
  const showPickupWindow =
    pickupWindow && (section.status === "aktivno" || section.status === "zakazano" || isActiveMeal);
  const posnoPreview =
    showPosnoMeals && section.status === "nerezervisano" && section.posnoMenuAvailable
      ? getPosnoMenuPreview(section.type)
      : null;
  const showPosnoBadge = showPosnoMeals && (section.isPosno || Boolean(posnoPreview));
  const canBookFocus = canBookMealSlot(todayDateKey, section.type, section.status);
  const showPassedMessage = shouldShowBookingPassedMessage(
    todayDateKey,
    section.type,
    section.status,
  );
  const focusLabel = isActiveMeal ? "Aktivan obrok" : "Sledeći obrok";

  return (
    <section
      className={`overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${className}`}
      id="today-meal-summary"
    >
      <div className="flex items-start gap-3 border-b border-black/5 px-4 py-4 lg:px-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
          <UtensilsCrossed aria-hidden="true" className="text-[#5055D2]" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-black lg:text-lg">Fokus obroka</h2>
            {showPosnoBadge ? <PosnoBadge size="md" /> : null}
          </div>
          <p className="mt-0.5 text-sm font-light text-black/55">
            {focusLabel} · {dateLabel} · {section.title}
          </p>
        </div>
        <MealStatusBadge status={section.status} />
      </div>

      <div className="p-4 lg:p-5">
        <CounterQueueBadge
          className="mb-3"
          dateKey={todayDateKey}
          mealType={section.type}
          variant="row"
        />
        {showPickupWindow ? (
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-[#5055D2]/5 px-3 py-2 text-sm font-medium text-[#5055D2]">
            <Clock aria-hidden="true" size={15} />
            Vreme preuzimanja: {pickupWindow}
          </p>
        ) : null}

        {section.items || posnoPreview ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {columnHeaders.map((header, index) => (
              <div
                className={`rounded-xl px-2 py-2.5 text-center ${
                  showPosnoBadge ? "bg-[#2f8f55]/8 ring-1 ring-[#2f8f55]/15" : "bg-[#EFF1F4]/70"
                }`}
                key={header}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">
                  {header}
                </p>
                <p className="mt-1 text-sm font-medium text-black">
                  {(section.items ?? posnoPreview)?.[columnKeys[index]]}
                </p>
              </div>
            ))}
          </div>
        ) : section.status === "nerezervisano" ? (
          <div className="rounded-xl border border-dashed border-black/10 bg-[#EFF1F4]/50 px-4 py-6 text-center">
            <p className="text-sm font-light text-black/55">
              Niste rezervisali {section.title.toLowerCase()} za {dateLabel}.
            </p>
            {canBookFocus ? (
              <>
                <ReservationBookByCountdown
                  className="mt-3"
                  dateKey={todayDateKey}
                  mealType={section.type}
                  status={section.status}
                />
                <Link
                  className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[#5055D2] bg-white px-4 py-2 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5"
                  href={getKreatorObrokaHref({ dateKey: todayDateKey, obrok: section.type })}
                >
                  Rezerviši {section.title.toLowerCase()}
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </>
            ) : showPassedMessage ? (
              <p className="mt-3 text-sm font-medium text-black/50">{mealBookingWindowPassedMessage}</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-black/10 bg-[#EFF1F4]/50 px-4 py-6 text-center text-sm font-light text-black/55">
            Nema rezervisanog obroka u fokusu za ovaj dan.
          </p>
        )}

        {section.status === "nerezervisano" && canBookFocus && posnoPreview ? (
          <Link
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2f8f55]/25 bg-[#2f8f55]/8 px-4 py-2 text-sm font-semibold text-[#2f8f55] transition-colors hover:bg-[#2f8f55]/12"
            href={getKreatorObrokaHref({ dateKey: todayDateKey, obrok: section.type })}
          >
            Rezerviši posno — {section.title.toLowerCase()}
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        ) : posnoPreview ? (
          <Link
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2f8f55]/25 bg-[#2f8f55]/8 px-4 py-2 text-sm font-semibold text-[#2f8f55] transition-colors hover:bg-[#2f8f55]/12"
            href={getRezervacijeHref({ dateKey: todayDateKey, obrok: section.type })}
          >
            Rezerviši posno — {section.title.toLowerCase()}
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        ) : null}

        {section.status === "aktivno" || heroType === "active" ? (
          <Link
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#5055D2]/25 bg-[#5055D2]/5 px-4 py-2 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10"
            href={getPreuzimanjeHref({ dateKey: todayDateKey, obrok: section.type })}
          >
            <QrCode aria-hidden="true" size={16} />
            Otvori QR kod
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        ) : null}

        <Link
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-black/45 transition-colors hover:text-[#5055D2]"
          href={getRezervacijeHref({ dateKey: todayDateKey, obrok: section.type })}
        >
          Svi detalji i preuzimanje karticom
          <ArrowRight aria-hidden="true" size={12} />
        </Link>
      </div>
    </section>
  );
}

export default TodayMealSummary;
