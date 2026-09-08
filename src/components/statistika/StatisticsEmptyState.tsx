"use client";

import Link from "next/link";
import { AlertCircle, CalendarDays } from "lucide-react";
import { useT } from "@/i18n/useT";

type StatisticsEmptyStateProps =
  | { variant: "empty" | "unavailable" }
  | { variant: "error"; message?: string; onRetry: () => void };

export function StatisticsEmptyState(props: StatisticsEmptyStateProps) {
  const { t } = useT();
  const variant = props.variant;

  const title =
    variant === "unavailable"
      ? t("statistics.unavailableTitle")
      : variant === "error"
        ? t("statistics.errorTitle")
        : t("statistics.emptyTitle");

  const description =
    variant === "unavailable"
      ? t("statistics.unavailableDescription")
      : variant === "error"
        ? props.message?.trim() || t("statistics.errorDescription")
        : t("statistics.emptyDescription");

  const Icon = variant === "error" ? AlertCircle : CalendarDays;
  const iconClass = variant === "error" ? "text-amber-600" : "text-[#5055D2]";
  const iconWrapClass =
    variant === "error" ? "bg-amber-500/10" : "bg-[#5055D2]/10";

  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:px-10">
      <div
        className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl ${iconWrapClass}`}
      >
        <Icon aria-hidden="true" className={iconClass} size={28} />
      </div>
      <h2 className="text-xl font-bold text-black lg:text-2xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm font-light leading-relaxed text-black/55 lg:text-base">
        {description}
      </p>
      {variant === "empty" ? (
        <Link
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#5055D2] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4348B0]"
          href="/rezervacije"
        >
          {t("statistics.emptyCta")}
        </Link>
      ) : null}
      {variant === "error" ? (
        <button
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#5055D2] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4348B0]"
          onClick={props.onRetry}
          type="button"
        >
          {t("statistics.errorRetry")}
        </button>
      ) : null}
    </div>
  );
}

export default StatisticsEmptyState;
