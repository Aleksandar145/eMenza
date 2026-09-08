"use client";

import Link from "next/link";
import { CalendarPlus, EyeOff, QrCode, Sparkles, Ticket } from "lucide-react";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { usePickupOrders } from "@/hooks/usePickupOrders";
import { useTodayMealView } from "@/hooks/useTodayMealView";
import {
  getMealPickupWindow,
  type MealType,
} from "@/lib/dashboard-mock";
import { canShowAiPreporuka } from "@/lib/meal-booking-window";
import { getPickupOrderForMeal, getPreuzimanjeHref } from "@/lib/preuzimanje-mock";
import { useT } from "@/i18n/useT";

type QuickActionsRowProps = {
  dateKey: string;
  onReserve: (obrok?: MealType) => void;
  onAiRecommend: () => void;
};

type QuickAction = {
  label: string;
  description: string;
  icon: typeof CalendarPlus;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};

function QuickActionCard({ action, lockedMessage }: { action: QuickAction; lockedMessage: string }) {
  const { showCardLock } = useCardAccess();
  const Icon = action.icon;
  const content = (
    <>
      <div className="flex size-10 items-center justify-center rounded-xl bg-[#5055D2]/10">
        <Icon aria-hidden="true" className="text-[#5055D2]" size={20} />
      </div>
      <div className="mt-3 min-w-0">
        <p className="text-sm font-bold text-black">{action.label}</p>
        <p className="mt-0.5 text-xs font-light text-black/55">{action.description}</p>
      </div>
    </>
  );

  const className = `flex min-h-[112px] flex-col rounded-[20px] border border-black/5 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all ${
    action.disabled
      ? "cursor-not-allowed opacity-45"
      : "hover:border-[#5055D2]/20 hover:shadow-[0_4px_16px_rgba(80,85,210,0.1)]"
  }`;

  const card =
    action.href && !action.disabled ? (
      <Link className={className} href={action.href}>
        {content}
      </Link>
    ) : (
      <button
        className={`${className} w-full text-left`}
        disabled={action.disabled}
        onClick={action.onClick}
        type="button"
      >
        {content}
      </button>
    );

  if (!showCardLock) {
    return card;
  }

  return (
    <div className="relative overflow-hidden rounded-[20px]">
      <div aria-hidden="true" className="pointer-events-none select-none blur-[4px] opacity-55">
        {card}
      </div>
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-white/65 px-2 backdrop-blur-[1px]"
        role="status"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-[#5055D2]/8">
          <EyeOff aria-hidden="true" className="text-[#5055D2]/70" size={16} />
        </div>
        <p className="max-w-[140px] text-center text-[11px] font-semibold leading-snug text-black/70">
          {lockedMessage}
        </p>
      </div>
    </div>
  );
}

export function QuickActionsRow({
  dateKey,
  onReserve,
  onAiRecommend,
}: QuickActionsRowProps) {
  const primary = useTodayMealView(dateKey);
  const { getOrderForMeal, usesRemote } = usePickupOrders();
  const { t } = useT();
  const pickupOrder = getOrderForMeal(dateKey, primary.section.type);
  const hasQrPickup = usesRemote
    ? pickupOrder?.status === "spremno"
    : primary.heroType === "active" &&
      getPickupOrderForMeal(dateKey, primary.section.type) !== null;
  const pickupWindow = getMealPickupWindow(dateKey, primary.section.type);
  const canShowAi = canShowAiPreporuka(dateKey, primary.section.type);

  const actions: QuickAction[] = [
    {
      label: t("dashboard.quickReserve"),
      description: t("dashboard.quickReserveDesc"),
      icon: CalendarPlus,
      onClick: () => onReserve(primary.section.type),
    },
    {
      label: t("dashboard.aiRecommend"),
      description: canShowAi ? t("dashboard.quickAiDesc") : t("dashboard.quickAiPassed"),
      icon: Sparkles,
      onClick: onAiRecommend,
      disabled: !canShowAi,
    },
    {
      label: t("dashboard.quickQr"),
      description: hasQrPickup
        ? t("dashboard.quickQrActive", { window: pickupWindow ?? "" })
        : t("dashboard.quickQrInactive"),
      icon: QrCode,
      href: getPreuzimanjeHref({ dateKey, obrok: primary.section.type }),
      disabled: !hasQrPickup,
    },
    {
      label: t("dashboard.quickToken"),
      description: t("dashboard.quickTokenDesc"),
      icon: Ticket,
      href: "/moj-zeton",
    },
  ];

  return (
    <section aria-label={t("dashboard.quickActions")}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action) => (
          <QuickActionCard
            action={action}
            key={action.label}
            lockedMessage={t("dashboard.lockedCardsMessage")}
          />
        ))}
      </div>
    </section>
  );
}

export default QuickActionsRow;
