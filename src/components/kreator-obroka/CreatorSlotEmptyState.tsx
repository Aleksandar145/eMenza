"use client";

import { UtensilsCrossed } from "lucide-react";
import { creatorSlotLabels, type CreatorSlotId } from "@/lib/kreator-obroka-mock";

type CreatorSlotEmptyStateProps = {
  slotId: CreatorSlotId;
  dateLabel: string;
  compact?: boolean;
  className?: string;
};

export function CreatorSlotEmptyState({
  slotId,
  dateLabel,
  compact = false,
  className = "",
}: CreatorSlotEmptyStateProps) {
  const category = creatorSlotLabels[slotId].toLowerCase();

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-6" : "px-6 py-10"} ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded-2xl bg-[#5055D2]/10 text-[#5055D2] ${compact ? "size-12" : "size-16"}`}
      >
        <UtensilsCrossed aria-hidden="true" size={compact ? 22 : 28} />
      </div>
      <p className={`mt-4 font-bold text-black ${compact ? "text-sm" : "text-lg"}`}>
        Nema objavljenih jela
      </p>
      <p className={`mt-2 max-w-sm font-light text-black/55 ${compact ? "text-xs" : "text-sm"}`}>
        Kuhinja nije objavila nijedno {category} jelo za {dateLabel}.
      </p>
    </div>
  );
}

export default CreatorSlotEmptyState;
