"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  QUEUE_STATUS_HELP,
  QUEUE_LEVELS,
  formatManualOverrideRemaining,
  type KitchenCounterQueueLevel,
  type KitchenCounterQueueSource,
} from "@/lib/kitchen-counter-queue";

export type { KitchenCounterQueueLevel };

type KitchenCounterQueueStatusProps = {
  level: KitchenCounterQueueLevel;
  source: KitchenCounterQueueSource;
  countLastMinute: number;
  disabled?: boolean;
  manualExpiresAt?: number | null;
  onSelectLevel?: (level: KitchenCounterQueueLevel) => void;
  onClearManual?: () => void;
};

function formatLookupCountLabel(count: number): string {
  if (count === 1) {
    return "1 učitavanje u poslednjoj min";
  }

  if (count >= 2 && count <= 4) {
    return `${count} učitavanja u poslednjoj min`;
  }

  return `${count} učitavanja u poslednjoj min`;
}

function buildSummary({
  level,
  source,
  countLastMinute,
  manualExpiresAt,
}: Pick<
  KitchenCounterQueueStatusProps,
  "level" | "source" | "countLastMinute" | "manualExpiresAt"
>): string {
  const activeLevel = QUEUE_LEVELS.find((entry) => entry.id === level) ?? QUEUE_LEVELS[0];

  if (source === "manual" && manualExpiresAt) {
    return `Ručno: ${activeLevel.label} · vraća se automatski za ${formatManualOverrideRemaining(manualExpiresAt)}`;
  }

  return `${formatLookupCountLabel(countLastMinute)} · automatski`;
}

export function KitchenCounterQueueStatus({
  level,
  source,
  countLastMinute,
  disabled = false,
  manualExpiresAt = null,
  onSelectLevel,
  onClearManual,
}: KitchenCounterQueueStatusProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const summary = buildSummary({ level, source, countLastMinute, manualExpiresAt });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-black">Stanje u redu</h3>
          <button
            aria-expanded={helpOpen}
            aria-label="Kako radi stanje u redu"
            className="inline-flex size-7 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/[0.05] hover:text-[#5055D2]"
            onClick={() => setHelpOpen((current) => !current)}
            type="button"
          >
            <CircleHelp aria-hidden="true" size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              source === "manual"
                ? "bg-amber-100 text-amber-800"
                : "bg-[#5055D2]/10 text-[#5055D2]"
            }`}
          >
            {source === "manual" ? "Ručno" : "Automatski"}
          </span>
          {source === "manual" && onClearManual ? (
            <button
              className="text-[10px] font-semibold text-[#5055D2] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled}
              onClick={onClearManual}
              type="button"
            >
              Vrati automatski
            </button>
          ) : null}
        </div>
      </div>

      {helpOpen ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-black/5 bg-[#EFF1F4]/70 px-3 py-3 text-xs leading-relaxed text-black/65">
          <div>
            <p className="font-semibold text-black">{QUEUE_STATUS_HELP.autoTitle}</p>
            <p className="mt-1">{QUEUE_STATUS_HELP.autoBody}</p>
          </div>
          <p>{QUEUE_STATUS_HELP.manualBody}</p>
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 font-medium text-amber-950">
            {QUEUE_STATUS_HELP.responsibility}
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {QUEUE_LEVELS.map((entry) => {
          const isActive = entry.id === level;

          return (
            <button
              aria-current={isActive ? "true" : undefined}
              aria-pressed={isActive}
              className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-opacity ${
                isActive ? entry.activeContainerClass : `${entry.inactiveContainerClass} opacity-55`
              } disabled:cursor-not-allowed disabled:opacity-40`}
              disabled={disabled || !onSelectLevel}
              key={entry.id}
              onClick={() => onSelectLevel?.(entry.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`inline-block size-2.5 shrink-0 rounded-full ${entry.dotClass} ${
                  isActive ? "shadow-[0_0_0_3px_rgba(0,0,0,0.06)]" : ""
                }`}
              />
              <span
                className={`text-sm ${isActive ? "font-semibold text-black" : "font-medium text-black/55"}`}
              >
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-black/50">{summary}</p>
    </div>
  );
}

export default KitchenCounterQueueStatus;
