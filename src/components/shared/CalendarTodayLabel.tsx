type CalendarTodayLabelProps = {
  isSelected?: boolean;
  compact?: boolean;
  className?: string;
};

export function CalendarTodayLabel({
  isSelected = false,
  compact = false,
  className = "",
}: CalendarTodayLabelProps) {
  return (
    <span
      className={`font-bold uppercase tracking-wide ${
        compact ? "text-[9px]" : "text-[10px]"
      } ${
        isSelected
          ? "text-white/90"
          : "rounded-full bg-[#5055D2]/12 px-1.5 py-0.5 text-[#5055D2] ring-1 ring-[#5055D2]/25"
      } ${className}`}
    >
      Danas
    </span>
  );
}

export default CalendarTodayLabel;
