"use client";

import { Clock, History } from "lucide-react";
import { KitchenCounterCollapsibleSection } from "@/components/kuhinja/KitchenCounterCollapsibleSection";
import { StaffCard } from "@/components/staff";
import type { KitchenCounterStats } from "@/lib/kuhinja-prep-mock";

const STATS_STORAGE_KEY = "emenza-counter-panel-stats";

type KitchenCounterStatsPanelProps = {
  stats: KitchenCounterStats;
  statsDisabled: boolean;
  onOpenHistory: () => void;
  onOpenPending: () => void;
};

function buildStatsMiniSummary(stats: KitchenCounterStats): string {
  return `${stats.ordered} naručeno · ${stats.pickedUp} preuzeto · ${stats.remaining} ostalo`;
}

export function KitchenCounterStatsPanel({
  stats,
  statsDisabled,
  onOpenHistory,
  onOpenPending,
}: KitchenCounterStatsPanelProps) {
  return (
    <KitchenCounterCollapsibleSection
      mini={buildStatsMiniSummary(stats)}
      storageKey={STATS_STORAGE_KEY}
      title="Statistike"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StaffCard className="p-5" padding="none">
          <p className="text-3xl font-extrabold text-black">{stats.ordered}</p>
          <p className="text-sm text-black/55">Naručeno</p>
        </StaffCard>

        <StaffCard className="flex flex-col p-5" padding="none">
          <p className="text-3xl font-extrabold text-black">{stats.pickedUp}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-black/55">Preuzeto</p>
            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5055D2] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={statsDisabled}
              onClick={onOpenHistory}
              type="button"
            >
              <History aria-hidden="true" size={14} />
              Istorija
            </button>
          </div>
        </StaffCard>

        <StaffCard className="flex flex-col p-5" padding="none">
          <p className="text-3xl font-extrabold text-black">{stats.remaining}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-black/55">Ostalo još</p>
            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5055D2] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={statsDisabled}
              onClick={onOpenPending}
              type="button"
            >
              <Clock aria-hidden="true" size={14} />
              Ko čeka
            </button>
          </div>
        </StaffCard>
      </div>
    </KitchenCounterCollapsibleSection>
  );
}

export default KitchenCounterStatsPanel;
