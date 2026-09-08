"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, QrCode, Ticket, UtensilsCrossed } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { CounterQueueBadge } from "@/components/shared/CounterQueueBadge";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import { QrPickupDisplay } from "@/components/preuzimanje/QrPickupDisplay";
import { usePickupOrders } from "@/hooks/usePickupOrders";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { clampToAvailableReservationDay } from "@/lib/dashboard-mock";
import type { PickupOrder } from "@/lib/preuzimanje-mock";
import { parseKreatorObrokaObrok } from "@/lib/kreator-obroka-mock";

const orderItemLabels = ["Glavno jelo", "Dodatak", "Salata", "Dezert"] as const;
const orderItemKeys = ["glavnoJelo", "dodatak", "salata", "obrok"] as const;

const cardClassName =
  "h-full overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)] lg:p-8";

function PickupStatusBadge({ status }: { status: PickupOrder["status"] }) {
  if (status === "preuzeto") {
    return (
      <span className="shrink-0 rounded-full bg-black/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black/50">
        Preuzeto
      </span>
    );
  }

  if (status === "zakazano") {
    return (
      <span className="shrink-0 rounded-full bg-[#5055D2]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#5055D2]">
        Zakazano
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-[#55de9a]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1a7a4a]">
      Spremno
    </span>
  );
}

function parseDateParam(value: string | null, todayDateKey: string) {
  if (value) {
    return clampToAvailableReservationDay(value);
  }

  return todayDateKey;
}

function OrderSummary({ order }: { order: PickupOrder }) {
  return (
    <section className={cardClassName}>
      <div className="mb-5 flex items-center gap-3 border-b border-black/5 pb-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
          <UtensilsCrossed aria-hidden="true" className="text-[#5055D2]" size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-black">Vaša narudžbina</h2>
          <p className="text-sm font-light text-black/55">Pregled rezervisanog obroka</p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#EFF1F4]/60 px-4 py-3">
        <p className="text-base font-bold text-black">
          {order.mealLabel} · {order.dateLabel}
        </p>
        <p className="mt-0.5 text-sm font-light text-black/55">{order.studentName}</p>
      </div>

      <ul className="mt-4 divide-y divide-black/5">
        {orderItemLabels.map((label, index) => (
          <li className="py-3 first:pt-0 last:pb-0" key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">{label}</p>
            <p className="mt-1 text-sm font-medium leading-snug text-black">
              {order.items[orderItemKeys[index]]}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyPickupState({ hasAnyOrders }: { hasAnyOrders: boolean }) {
  return (
    <div className="rounded-[20px] border border-dashed border-black/12 bg-[#EFF1F4]/60 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white">
        <QrCode aria-hidden="true" className="text-black/30" size={28} />
      </div>
      <h2 className="text-lg font-bold text-black">Nema obroka spremnih za preuzimanje</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-light text-black/55">
        QR kod je dostupan kada je obrok aktivan — nakon rezervacije i u vreme serviranja u menzi.
      </p>
      {!hasAnyOrders ? (
        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[#5055D2] bg-white px-5 py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5"
          href="/rezervacije"
        >
          <CalendarDays aria-hidden="true" size={16} />
          Idi na rezervacije
        </Link>
      ) : null}
    </div>
  );
}

export function PreuzimanjePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const todayDateKey = useTodayDateKey();
  const { orders, getOrderForMeal } = usePickupOrders();

  const dateKey = parseDateParam(searchParams.get("datum"), todayDateKey);
  const mealType = parseKreatorObrokaObrok(searchParams.get("obrok")) ?? "lunch";
  const order = getOrderForMeal(dateKey, mealType) ?? orders[0] ?? null;

  return (
    <AppLayout
      subtitle="Pokažite QR kod na šalteru umesto kartice — osoblje skenira i vidi vašu narudžbinu."
      title="QR preuzimanje"
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <button
          className="-mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-black/50 transition-colors hover:text-[#5055D2]"
          onClick={() => router.back()}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Nazad
        </button>

        {order ? (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_1fr] lg:items-stretch">
              <MealBookingLockedSection>
                <section className={cardClassName}>
                  <div className="mb-6 flex items-start justify-between gap-3 border-b border-black/5 pb-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
                        <QrCode aria-hidden="true" className="text-[#5055D2]" size={22} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-black">Vaš QR kod</h2>
                        <p className="text-sm font-light text-black/55">
                          Držite ekran osvetljenim prema šalteru
                        </p>
                      </div>
                    </div>
                    <PickupStatusBadge status={order.status} />
                  </div>

                  <QrPickupDisplay layout="centered" order={order} size={220} />
                </section>
              </MealBookingLockedSection>

              <MealBookingLockedSection>
                <div className="flex h-full flex-col gap-3">
                  <CounterQueueBadge
                    className="flex w-full justify-center sm:justify-start"
                    dateKey={order.dateKey}
                    mealType={order.mealType}
                    variant="row"
                  />
                  <OrderSummary order={order} />
                </div>
              </MealBookingLockedSection>
            </div>

            <p className="text-center text-sm font-light text-black/55">
              Nakon preuzimanja obroka dobijate{" "}
              <Link className="font-semibold text-[#5055D2] hover:underline" href="/moj-zeton">
                <Ticket aria-hidden="true" className="mr-1 inline" size={14} />
                eZeton za pribor
              </Link>
              .
            </p>
          </>
        ) : (
          <MealBookingLockedSection>
            <EmptyPickupState hasAnyOrders={orders.length > 0} />
          </MealBookingLockedSection>
        )}
      </div>
    </AppLayout>
  );
}

export default PreuzimanjePage;
