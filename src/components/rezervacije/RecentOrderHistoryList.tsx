"use client";

import { CheckCircle, Clock, XCircle } from "lucide-react";
import {
  buildRecentOrdersFromMock,
  buildRecentOrdersFromReservations,
} from "@/lib/reservations-view";
import { mealDotClass } from "@/lib/dashboard-mock";
import type { RecentOrderStatus } from "@/lib/rezervacije-mock";
import type { ReservationRecord } from "@/server/repositories/reservations";

type RecentOrderHistoryListProps = {
  className?: string;
  reservations?: ReservationRecord[];
  refreshKey?: number;
};

const statusConfig: Record<
  RecentOrderStatus,
  { icon: typeof CheckCircle; className: string; wrapClass: string; label: string }
> = {
  success: {
    icon: CheckCircle,
    className: "text-[#55de9a]",
    wrapClass: "bg-[#55de9a]/15",
    label: "Preuzeto",
  },
  pending: {
    icon: Clock,
    className: "text-[#5055D2]",
    wrapClass: "bg-[#5055D2]/10",
    label: "Zakazano",
  },
  cancelled: {
    icon: XCircle,
    className: "text-red-500",
    wrapClass: "bg-red-50",
    label: "Propusteno",
  },
};

export function RecentOrderHistoryList({
  className = "",
  reservations,
  refreshKey = 0,
}: RecentOrderHistoryListProps) {
  void refreshKey;

  const orders =
    reservations !== undefined
      ? buildRecentOrdersFromReservations(reservations)
      : buildRecentOrdersFromMock();

  return (
    <section
      className={`overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div className="border-b border-black/5 px-4 py-3 lg:px-5">
        <h2 className="text-base font-bold text-black lg:text-lg">Poslednje narudžbine</h2>
        <p className="mt-0.5 text-xs font-light text-black/50">
          Svi rezervisani obroci sa stavkama koje ste izabrali
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="px-4 py-6 text-sm font-light text-black/55 lg:px-5">
          Još nemate rezervisanih obroka.
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {orders.map((order) => {
            const config = statusConfig[order.status];
            const Icon = config.icon;

            return (
              <li
                className="flex items-start gap-3 px-4 py-3.5 lg:gap-4 lg:px-5 lg:py-4"
                key={order.id}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full lg:size-11 ${config.wrapClass}`}
                >
                  <Icon aria-hidden="true" className={config.className} size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${mealDotClass(order.mealType)}`}
                    />
                    <p className="text-sm font-bold text-black lg:text-base">{order.mealLabel}</p>
                    <p className="text-xs font-medium text-black/45 lg:text-sm">{order.dateLabel}</p>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/45">
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-light leading-relaxed text-black/65">
                    {order.summary}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default RecentOrderHistoryList;
