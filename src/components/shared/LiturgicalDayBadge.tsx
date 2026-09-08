import type { LiturgicalDayInfo } from "@/lib/liturgical-calendar";

type LiturgicalDayBadgeProps = {
  info: LiturgicalDayInfo;
  compact?: boolean;
  selected?: boolean;
  className?: string;
};

export function LiturgicalDayBadge({
  info,
  compact = false,
  selected = false,
  className = "",
}: LiturgicalDayBadgeProps) {
  if (!info.shortLabel) {
    return null;
  }

  const toneClass = selected
    ? "bg-white/20 text-white"
    : info.period === "ramazan"
      ? "bg-[#5055D2]/10 text-[#5055D2]"
      : "bg-[#b45309]/10 text-[#b45309]";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${toneClass} ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      } ${className}`}
      title={info.label ?? undefined}
    >
      {info.shortLabel}
    </span>
  );
}

export default LiturgicalDayBadge;
