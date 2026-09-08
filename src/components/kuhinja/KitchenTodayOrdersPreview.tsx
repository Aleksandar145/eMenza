"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KitchenCurrentOrderPanel } from "@/components/kuhinja/KitchenCurrentOrderPanel";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";

export function KitchenTodayOrdersPreview() {
  const todayDateKey = useTodayDateKey();

  return (
    <div className="space-y-3">
      <KitchenCurrentOrderPanel dateKey={todayDateKey} mealType="lunch" />

      <div className="flex justify-end">
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5055D2] hover:underline"
          href="/kuhinja/narudzbine"
        >
          Sve narudžbine
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </div>
  );
}

export default KitchenTodayOrdersPreview;
