import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StaffStatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  meta?: ReactNode;
  trend?: "up" | "down" | "neutral";
  accent?: "default" | "success" | "warning";
  bars?: number[];
};

const accentIconBg: Record<NonNullable<StaffStatCardProps["accent"]>, string> = {
  default: "bg-[#5055D2]/10 text-[#5055D2]",
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
};

export function StaffStatCard({
  label,
  value,
  icon: Icon,
  meta,
  trend = "neutral",
  accent = "default",
  bars,
}: StaffStatCardProps) {
  const trendColor =
    trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-[var(--text-secondary)]";

  return (
    <div className="staff-card group p-5 transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${accentIconBg[accent]}`}
        >
          <Icon aria-hidden="true" size={20} />
        </div>
        {bars && bars.length > 0 ? (
          <div aria-hidden="true" className="flex h-8 items-end gap-0.5">
            {bars.map((height, index) => (
              <span
                className="w-1.5 rounded-full bg-[#5055D2]/25 transition-colors group-hover:bg-[#5055D2]/45"
                key={index}
                style={{ height: `${Math.max(20, height)}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{label}</p>
      {meta ? <div className={`mt-2 text-xs font-medium ${trendColor}`}>{meta}</div> : null}
    </div>
  );
}
