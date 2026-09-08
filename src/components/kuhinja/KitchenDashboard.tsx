"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock, Plus, Users } from "lucide-react";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { KitchenAdminNotices } from "@/components/kuhinja/KitchenAdminNotices";
import { StaffBadge, StaffCard, StaffStatCard } from "@/components/staff";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { getKitchenReservationsForMeal, getTodaySignedUpStudentCount } from "@/lib/kuhinja-prep-mock";
import { countMenuAlerts, getDayMenuOverview, getWeekDayKeys, getWeekStartForDate, mealTypeLabels } from "@/lib/kuhinja-menu-overview";
import { isDailyMenuPublished } from "@/lib/kuhinja-jelovnik-store";
import { canAccessKitchenGroup, normalizeKitchenStaffRole } from "@/lib/kuhinja-roles";
import type { MealType } from "@/lib/meal-types";

const MEAL_CONFIG: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Doručak" },
  { type: "lunch", label: "Ručak" },
  { type: "dinner", label: "Večera" },
];

const DAY_LABELS = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

const REFRESH_INTERVAL_MS = 30_000;

export function KitchenDashboard() {
  const { session } = useKuhinjaSessionContext();
  const staffRole = normalizeKitchenStaffRole(session?.role);
  const showCounterOps = canAccessKitchenGroup(staffRole, "counter");
  const showKitchenOps = canAccessKitchenGroup(staffRole, "kitchen");

  const today = useTodayDateKey();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const lunchReservations = getKitchenReservationsForMeal(today, "lunch");
  const activeToday = lunchReservations.filter((entry) => entry.status === "aktivno").length;
  const scheduledToday = lunchReservations.filter((entry) => entry.status === "zakazano").length;
  const pickedUpToday = lunchReservations.filter((entry) => entry.status === "iskorisceno").length;
  const menuAlertCount = countMenuAlerts();
  const signedUpStudentsToday = getTodaySignedUpStudentCount(today);

  const mealStats = MEAL_CONFIG.map((meal) => {
    const reservations = getKitchenReservationsForMeal(today, meal.type);
    const published = isDailyMenuPublished(today, meal.type);
    return {
      ...meal,
      count: reservations.length,
      published,
    };
  });

  const weekOverview = useMemo(() => {
    const weekStart = getWeekStartForDate(today);
    const days = getWeekDayKeys(weekStart, 7);
    return days.map((dateKey, idx) => {
      const overview = getDayMenuOverview(dateKey);
      const meals = MEAL_CONFIG.map((meal) => ({
        type: meal.type,
        label: mealTypeLabels[meal.type],
        status: overview.meals[meal.type].status,
      }));
      const dayLabel = new Date(dateKey + "T12:00:00").toLocaleDateString("sr-RS", { weekday: "short" });
      const dayNum = new Date(dateKey + "T12:00:00").getDate();
      const isToday = dateKey === today;
      return { dateKey, dayLabel, dayNum, meals, isToday };
    });
  }, [today]);

  const quickLinks = [
    {
      label: "Pregled jelovnika",
      href: "/kuhinja/pregled-jelovnika",
      icon: CalendarDays,
      desc:
        showKitchenOps && menuAlertCount > 0
          ? `${menuAlertCount} upozorenja`
          : "Kalendar i status menija",
      accent: "border-l-[#5055D2]",
    },
    ...(showKitchenOps
      ? [
          {
            label: "Priprema",
            href: "/kuhinja/priprema",
            icon: ClipboardList,
            desc: "Količine po jelima",
            accent: "border-l-emerald-500",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <StaffCard padding="none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {showCounterOps ? "Operativni pregled" : "Današnji pregled"}
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
              {formatCalendarDayLabel(today)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showCounterOps ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isDailyMenuPublished(today, "lunch") ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {isDailyMenuPublished(today, "lunch") ? (
                  <><CheckCircle2 aria-hidden="true" size={14} /> Jelovnik objavljen</>
                ) : (
                  <><Clock aria-hidden="true" size={14} /> Jelovnik nije objavljen</>
                )}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Auto-osvežavanje
            </span>
          </div>
        </div>

        {showKitchenOps ? (
          <div className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Prijave po obrocima
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {mealStats.map((meal) => (
                <div
                  className={`rounded-xl border px-4 py-3 ${
                    meal.published
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-amber-200 bg-amber-50/50"
                  }`}
                  key={meal.type}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{meal.label}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        meal.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {meal.published ? "Objavljen" : "Nije objavljen"}
                    </span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{meal.count}</p>
                  <p className="text-xs text-[var(--text-secondary)]">prijavljenih studenata</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--bg-primary)] px-4 py-2.5">
              <Users size={16} className="text-[#5055D2]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Ukupno {signedUpStudentsToday} {signedUpStudentsToday === 1 ? "student" : "studenata"} danas
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <StaffStatCard
              accent="default"
              icon={Users}
              label="Prijavljeno studenata"
              meta="Danas · doručak, ručak i večera"
              value={String(signedUpStudentsToday)}
            />
            <StaffStatCard
              accent="success"
              icon={CheckCircle2}
              label="Spremno za preuzimanje"
              meta="Ručak danas"
              value={String(activeToday)}
            />
            <StaffStatCard
              icon={Clock}
              label="Zakazano"
              meta="Ručak danas"
              value={String(scheduledToday)}
            />
            <StaffStatCard
              accent="default"
              icon={Users}
              label="Preuzeto"
              meta="Ručak danas"
              value={String(pickedUpToday)}
            />
          </div>
        )}
      </StaffCard>

      {showCounterOps ? null : <KitchenAdminNotices />}

      {showKitchenOps && menuAlertCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-amber-950">Upozorenja za jelovnik</p>
            <p className="mt-1 text-sm text-amber-900/80">
              {menuAlertCount} obroka u prozoru rezervacija još nije spremno za studente.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white"
            href="/kuhinja/pregled-jelovnika"
          >
            Pregledaj
            <StaffBadge count={menuAlertCount} variant="neutral" />
          </Link>
        </div>
      ) : null}

      {showKitchenOps ? (
        <>
          <StaffCard title="Brze akcije">
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4045B2]"
                href="/kuhinja/pregled-jelovnika"
              >
                <CalendarDays size={14} />
                Kreiraj jelovnik
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[#5055D2]/30 hover:text-[#5055D2]"
                href="/kuhinja/nedeljni-raspored"
              >
                <ClipboardList size={14} />
                Nedeljni raspored
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[#5055D2]/30 hover:text-[#5055D2]"
                href="/kuhinja/priprema"
              >
                <Plus size={14} />
                Priprema
              </Link>
            </div>
          </StaffCard>

          <StaffCard title="Status jelovnika za nedelju">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="pb-2 pr-3 text-left text-xs font-semibold text-[var(--text-muted)]" />
                    {MEAL_CONFIG.map((meal) => (
                      <th className="pb-2 px-2 text-center text-xs font-semibold text-[var(--text-muted)]" key={meal.type}>
                        {meal.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekOverview.map((day) => (
                    <tr className={`border-b border-[var(--card-border)]/50 last:border-0 ${day.isToday ? "bg-[#5055D2]/5" : ""}`} key={day.dateKey}>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${day.isToday ? "text-[#5055D2]" : "text-[var(--text-secondary)]"}`}>
                            {day.dayLabel}
                          </span>
                          <span className={`text-xs ${day.isToday ? "font-bold text-[#5055D2]" : "text-[var(--text-muted)]"}`}>
                            {day.dayNum}
                          </span>
                          {day.isToday ? <span className="size-1.5 rounded-full bg-[#5055D2]" /> : null}
                        </div>
                      </td>
                      {day.meals.map((meal) => {
                        const isPublished = meal.status === "published";
                        const isMissing = meal.status === "missing";
                        return (
                          <td className="px-2 py-2 text-center" key={meal.type}>
                            <span
                              className={`inline-block size-2.5 rounded-full ${
                                isPublished ? "bg-emerald-400" : isMissing ? "bg-red-400" : "bg-amber-300"
                              }`}
                              title={`${day.dayLabel} ${meal.label}: ${meal.status}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" /> Objavljen</span>
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-300" /> Nacrt</span>
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-red-400" /> Nedostaje</span>
              </div>
            </div>
          </StaffCard>
        </>
      ) : null}

      {showCounterOps ? (
        <>
          <KitchenAdminNotices />
          <Link
            className="staff-card group flex items-center justify-between border-l-4 border-l-[#5055D2] p-5 transition-shadow hover:shadow-[var(--shadow-md)]"
            href="/kuhinja/narudzbine"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#5055D2]/10">
                <ClipboardList aria-hidden="true" className="text-[#5055D2]" size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">Šalter</span>
                <span className="block text-xs text-[var(--text-secondary)]">
                  Skenirajte karticu ili QR i servirajte obrok
                </span>
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="text-[var(--text-secondary)] group-hover:text-[#5055D2]"
              size={16}
            />
          </Link>
        </>
      ) : null}

      {quickLinks.length > 0 ? (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              className={`staff-card group flex items-center justify-between border-l-4 p-5 transition-shadow hover:shadow-[var(--shadow-md)] ${link.accent}`}
              href={link.href}
              key={link.href}
            >
              <span className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#5055D2]/10">
                  <Icon aria-hidden="true" className="text-[#5055D2]" size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">{link.label}</span>
                  <span className="block text-xs text-[var(--text-secondary)]">{link.desc}</span>
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="text-[var(--text-secondary)] group-hover:text-[#5055D2]"
                size={16}
              />
            </Link>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}

export default KitchenDashboard;
