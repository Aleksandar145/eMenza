type StaffBadgeProps = {
  count?: number;
  label?: string;
  variant?: "accent" | "warning" | "success" | "neutral";
  dot?: boolean;
  /** Prikazuje pulse animaciju (npr. za nepročitane stavke). */
  pulse?: boolean;
};

const variantClasses: Record<NonNullable<StaffBadgeProps["variant"]>, string> = {
  accent: "bg-[#5055D2] text-white shadow-[0_1px_4px_rgba(80,85,210,0.3)]",
  warning:
    "bg-amber-500 text-white shadow-[0_1px_4px_rgba(245,158,11,0.35)]",
  success: "bg-emerald-600 text-white shadow-[0_1px_4px_rgba(16,185,129,0.3)]",
  neutral: "bg-[#E5E7EB] text-[#6B7280]",
};

export function StaffBadge({
  count,
  label,
  variant = "accent",
  dot = false,
  pulse = false,
}: StaffBadgeProps) {
  if (dot) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block size-2 shrink-0 rounded-full ${
          pulse ? "animate-pulse" : ""
        } ${variant === "warning" ? "bg-amber-500" : "bg-[#5055D2]"}`}
      />
    );
  }

  const text = label ?? (count !== undefined && count > 0 ? String(count) : null);
  if (!text) return null;

  return (
    <span
      className={`inline-flex min-w-[1.375rem] items-center justify-center rounded-full px-1.5 py-[3px] text-[11px] font-bold leading-none tabular-nums ${
        variantClasses[variant]
      } ${pulse ? "animate-pulse" : ""}`}
    >
      {text}
    </span>
  );
}
