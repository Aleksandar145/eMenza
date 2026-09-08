import type { LiturgicalDayInfo } from "@/lib/liturgical-calendar";

export type LiturgicalDayTone = "default" | "ramazan" | "posno";

export function getLiturgicalDayTone(info: LiturgicalDayInfo | null): LiturgicalDayTone {
  if (!info?.shortLabel) {
    return "default";
  }

  if (info.period === "ramazan") {
    return "ramazan";
  }

  return "posno";
}

const stripUnselected =
  "border-black/5 bg-[#EFF1F4]/60 text-black hover:border-[#5055D2]/25";

const stripSelected: Record<LiturgicalDayTone, string> = {
  default:
    "border-[#5055D2] bg-[#5055D2] text-white shadow-[0_2px_8px_rgba(80,85,210,0.3)]",
  ramazan:
    "border-[#5055D2] bg-[#5055D2] text-white shadow-[0_2px_8px_rgba(80,85,210,0.35)]",
  posno:
    "border-[#b45309] bg-[#b45309] text-white shadow-[0_2px_8px_rgba(180,83,9,0.35)]",
};

const monthSelected: Record<LiturgicalDayTone, string> = {
  default: "bg-[#5055D2] shadow-[0_2px_8px_rgba(80,85,210,0.35)]",
  ramazan: "bg-[#5055D2] shadow-[0_2px_8px_rgba(80,85,210,0.35)]",
  posno: "bg-[#b45309] shadow-[0_2px_8px_rgba(180,83,9,0.35)]",
};

export function getLiturgicalDayStripCellClasses(opts: {
  tone: LiturgicalDayTone;
  isSelected: boolean;
  isViewOnly?: boolean;
}): string {
  const { tone, isSelected, isViewOnly = false } = opts;

  if (isViewOnly) {
    return isSelected
      ? "border-black/20 bg-[#EFF1F4]/50 text-black/60"
      : "border-black/5 bg-[#EFF1F4]/30 text-black/45 hover:border-black/15";
  }

  return isSelected ? stripSelected[tone] : stripUnselected;
}

export function getLiturgicalDayStripWeekdayClasses(opts: {
  isSelected: boolean;
  isViewOnly?: boolean;
}): string {
  const { isSelected, isViewOnly = false } = opts;

  if (isSelected && !isViewOnly) {
    return "text-white/80";
  }

  return "text-black/45";
}

export function getLiturgicalDayMonthSelectedClasses(tone: LiturgicalDayTone): string {
  return monthSelected[tone];
}

/** Istaknut plavi outline za današnji dan (neizabran). */
export function getCalendarTodayOutlineClasses(
  isSelected: boolean,
  ringOffsetClass = "ring-offset-white",
): string {
  if (isSelected) {
    return "";
  }

  return `ring-2 ring-[#5055D2] ${ringOffsetClass} ring-offset-2 shadow-[0_0_0_1px_rgba(80,85,210,0.2),0_2px_10px_rgba(80,85,210,0.18)]`;
}
