"use client";

import Link from "next/link";
import { ArrowRight, Moon, ShoppingBag } from "lucide-react";
import { useMealReservations } from "@/hooks/useMealReservations";
import { getMealDetailsForDay } from "@/lib/dashboard-mock";
import { isInRamadan } from "@/lib/liturgical-calendar";
import { shouldPreferPosnoMeals } from "@/lib/fasting-preferences";
import type { FastingPreferences } from "@/lib/fasting-preferences";
import type { UserReligion } from "@/lib/user-preferences";
import { buildMealDetailsForDay } from "@/lib/reservations-view";
import { getRezervacijeHref } from "@/lib/rezervacije-mock";

type IftarPonetiBannerProps = {
  dateKey: string;
  religion: UserReligion;
  fasting: FastingPreferences;
  className?: string;
};

export function IftarPonetiBanner({
  dateKey,
  religion,
  fasting,
  className = "",
}: IftarPonetiBannerProps) {
  const { reservations, usesBackend } = useMealReservations();

  if (religion !== "islam" || !isInRamadan(dateKey) || !shouldPreferPosnoMeals(religion, dateKey, fasting)) {
    return null;
  }

  const { sections } = usesBackend
    ? buildMealDetailsForDay(dateKey, reservations)
    : getMealDetailsForDay(dateKey);
  const dinner = sections.find((section) => section.type === "dinner");
  if (!dinner || dinner.status !== "nerezervisano") {
    return null;
  }

  return (
    <section
      className={`overflow-hidden rounded-[20px] border border-[#5055D2]/20 bg-gradient-to-br from-[#5055D2]/8 via-white to-[#9093E1]/10 shadow-[0_2px_16px_rgba(80,85,210,0.12)] ${className}`}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/12">
            <Moon aria-hidden="true" className="text-[#5055D2]" size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-black">Iftar večeras</h2>
            <p className="mt-1 text-sm font-light leading-relaxed text-black/60">
              Rezervišite posni obrok za iftar. Dostupna je opcija{" "}
              <strong className="font-semibold text-[#5055D2]">„poneti“</strong> — preuzmite paket na
              šalteru posle zalaska sunca.
            </p>
          </div>
        </div>
        <Link
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#5055D2] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90"
          href={getRezervacijeHref({ dateKey, obrok: "dinner" })}
        >
          <ShoppingBag aria-hidden="true" size={16} />
          Rezerviši „poneti“
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </section>
  );
}

export default IftarPonetiBanner;
