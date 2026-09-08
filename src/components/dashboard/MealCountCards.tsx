"use client";

import type { LucideIcon } from "lucide-react";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";
import { useMealCountCards } from "@/hooks/useMealCountCards";
import { type MealType } from "@/lib/dashboard-mock";
import { getMealTypeLabel } from "@/i18n/catalog";
import { useT } from "@/i18n/useT";

const mealAccent: Record<
  MealType,
  { iconWrap: string; count: string; icon: string }
> = {
  breakfast: {
    iconWrap: "bg-[var(--meal-breakfast)]/15",
    count: "text-[#2f8f55]",
    icon: "text-[var(--meal-breakfast)]",
  },
  lunch: {
    iconWrap: "bg-[var(--meal-lunch)]/12",
    count: "text-[#3164d6]",
    icon: "text-[var(--meal-lunch)]",
  },
  dinner: {
    iconWrap: "bg-[var(--meal-dinner)]/20",
    count: "text-[#8a7b2e]",
    icon: "text-[var(--meal-dinner)]",
  },
};

type MealCountCardsProps = {
  className?: string;
};

function MealCountCardItem({
  label,
  type,
  count,
  icon: Icon,
  mealsLabel,
}: {
  label: string;
  type: MealType;
  count: number;
  icon: LucideIcon;
  mealsLabel: string;
}) {
  const accent = mealAccent[type];

  return (
    <MealBookingLockedSection className="min-h-full" variant="compact">
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-3 lg:px-5 lg:py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-black lg:text-base">{label}</p>
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl lg:size-10 ${accent.iconWrap}`}
          >
            <Icon aria-hidden="true" className={accent.icon} size={18} strokeWidth={2} />
          </div>
        </div>
        <div className="mt-2 lg:mt-3">
          <p className={`text-2xl font-bold tabular-nums lg:text-3xl ${accent.count}`}>
            {count}
          </p>
          <p className="text-xs font-light text-black/55 lg:text-sm">{mealsLabel}</p>
        </div>
      </div>
    </MealBookingLockedSection>
  );
}

export function MealCountCards({ className = "" }: MealCountCardsProps) {
  const cards = useMealCountCards();
  const { language, t } = useT();
  const mealsLabel = t("dashboard.mealsCountLabel");

  return (
    <section
      aria-label={t("dashboard.mealsCountAria")}
      className={`card-light shrink-0 overflow-hidden rounded-[20px] ${className}`}
    >
      <div className="grid grid-cols-3 divide-x divide-black/5">
        {cards.map((card) => (
          <MealCountCardItem
            count={card.count}
            icon={card.icon}
            key={card.type}
            label={getMealTypeLabel(language, card.type)}
            mealsLabel={mealsLabel}
            type={card.type}
          />
        ))}
      </div>
    </section>
  );
}

export default MealCountCards;
