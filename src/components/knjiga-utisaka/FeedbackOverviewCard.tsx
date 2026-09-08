"use client";

import { Star } from "lucide-react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { shouldUseAdminApi } from "@/lib/backend/admin-api";
import { getFeedbackEntries } from "@/lib/admin-system-store";
import { feedbackOverview } from "@/lib/knjiga-utisaka-mock";

type FeedbackOverviewCardProps = {
  className?: string;
};

function buildOverviewFromEntries(entries: ReturnType<typeof getFeedbackEntries>) {
  if (entries.length === 0) {
    return feedbackOverview;
  }

  const average =
    entries.reduce((sum, entry) => sum + entry.rating, 0) / Math.max(entries.length, 1);

  return {
    averageRating: {
      label: "Prosečna ocena",
      value: average.toFixed(1),
      detail: `Na osnovu ${entries.length} utisaka`,
    },
    totalFeedback: {
      label: "Ukupno utisaka",
      value: String(entries.length),
      detail: "U knjizi utisaka",
    },
  };
}

export function FeedbackOverviewCard({ className = "" }: FeedbackOverviewCardProps) {
  useAdminSystem();
  const entries = getFeedbackEntries();
  const { averageRating, totalFeedback } = shouldUseAdminApi()
    ? buildOverviewFromEntries(entries)
    : feedbackOverview;

  return (
    <div
      className={`rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
            {averageRating.label}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-black lg:text-3xl">
              {averageRating.value}
            </span>
            <Star
              aria-hidden="true"
              className="fill-[#5055D2] text-[#5055D2]"
              size={20}
            />
          </div>
          <p className="mt-0.5 text-xs font-light text-black/55 lg:text-sm">
            {averageRating.detail}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
            {totalFeedback.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-black lg:text-3xl">
            {totalFeedback.value}
          </p>
          <p className="mt-0.5 text-xs font-light text-black/55 lg:text-sm">
            {totalFeedback.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

export default FeedbackOverviewCard;
