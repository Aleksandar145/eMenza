"use client";

import { useMemo, useState } from "react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { StaffCard, StaffSegmentedControl, StaffStatCard } from "@/components/staff";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";

export function KitchenFeedbackPage() {
  const { state } = useAdminSystem({ scope: "full" });
  const [filter, setFilter] = useState<"all" | "unreviewed">("all");

  const overview = useMemo(() => {
    const entries = state.feedbackEntries;
    const avg =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + e.rating, 0) / entries.length
        : 0;
    return { count: entries.length, avg };
  }, [state.feedbackEntries]);

  const items =
    filter === "unreviewed"
      ? state.feedbackEntries.filter((e) => !e.reviewed)
      : state.feedbackEntries;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StaffStatCard label="Prosečna ocena" value={overview.avg.toFixed(1)} icon={Star} />
        <StaffStatCard label="Ukupno utisaka" value={String(overview.count)} icon={Star} />
      </div>

      <StaffSegmentedControl
        options={[
          { id: "all", label: "Svi" },
          { id: "unreviewed", label: "Nepregledani" },
        ]}
        value={filter}
        onChange={(v) => setFilter(v)}
      />

      <ul className="space-y-3">
        {items.map((entry) => (
          <StaffCard key={entry.id} padding="sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {entry.name} · {entry.rating}/5
                </p>
                <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                  <span>{entry.date}</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp aria-hidden="true" size={11} />
                    {entry.helpfulCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsDown aria-hidden="true" size={11} />
                    {entry.disagreeCount}
                  </span>
                </div>
              </div>
              {entry.reviewed ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Pregledano
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Čeka odgovor
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">{entry.message}</p>

            {entry.adminReply && (
              <div className="mt-2 rounded-lg bg-[#5055D2]/5 px-3 py-2 text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[#5055D2]">Admin: </span>
                {entry.adminReply}
              </div>
            )}
          </StaffCard>
        ))}

        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">
            Nema utisaka za prikaz.
          </p>
        )}
      </ul>
    </div>
  );
}
