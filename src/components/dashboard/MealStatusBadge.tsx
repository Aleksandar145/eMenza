import type { MealReservationStatus } from "@/lib/dashboard-mock";

const statusConfig: Record<
  MealReservationStatus,
  { label: string; className: string }
> = {
  iskorisceno: {
    label: "Iskorišćeno",
    className: "border-[#55de9a]/30 bg-[#55de9a]/10 text-[#2f8f55]",
  },
  propusteno: {
    label: "Propusteno",
    className: "border-red-300 bg-red-50 text-red-600",
  },
  aktivno: {
    label: "Aktivno",
    className: "border-[#5055D2]/30 bg-[#5055D2]/10 text-[#5055D2]",
  },
  zakazano: {
    label: "Zakazano",
    className: "border-black/10 bg-[#EFF1F4] text-black/55",
  },
  nerezervisano: {
    label: "Nerezervisano",
    className: "border-dashed border-black/15 bg-white text-black/45",
  },
};

type MealStatusBadgeProps = {
  status: MealReservationStatus;
};

export function MealStatusBadge({ status }: MealStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      aria-label={`Status obroka: ${config.label}`}
      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide lg:text-xs ${config.className}`}
    >
      {config.label}
    </span>
  );
}
