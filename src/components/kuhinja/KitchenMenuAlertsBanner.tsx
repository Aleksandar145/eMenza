"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getMissingMenuAlerts, getJelovnikEditorHref } from "@/lib/kuhinja-menu-overview";

const cardClass =
  "rounded-[20px] border border-amber-200 bg-amber-50 shadow-[0_2px_16px_rgba(0,0,0,0.05)]";

export function KitchenMenuAlertsBanner() {
  const alerts = getMissingMenuAlerts();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className={`p-5 ${cardClass}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={20} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-amber-950">
            Potrebna akcija — {alerts.length}{" "}
            {alerts.length === 1 ? "jelovnik" : alerts.length < 5 ? "jelovnika" : "jelovnika"} u prozoru
            rezervacija
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            Za svaki dan u prozoru rezervacija objavite doručak, ručak i večeru sa bar jednim jelom.
          </p>
          <ul className="mt-3 space-y-2">
            {alerts.slice(0, 6).map((alert) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2"
                key={alert.id}
              >
                <span className="text-sm text-amber-950">
                  <span className="font-semibold">{alert.dateLabel}</span>
                  <span className="text-amber-900/70"> · {alert.mealLabel}</span>
                  <span className="text-amber-800/80"> — {alert.message}</span>
                </span>
                <Link
                  className="shrink-0 rounded-full bg-[#5055D2] px-3 py-1 text-xs font-semibold text-white hover:bg-[#4348b8]"
                  href={getJelovnikEditorHref(alert.dateKey, alert.mealType)}
                >
                  Kreiraj
                </Link>
              </li>
            ))}
          </ul>
          {alerts.length > 6 ? (
            <p className="mt-2 text-xs text-amber-800/70">+ još {alerts.length - 6} stavki u kalendaru</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
