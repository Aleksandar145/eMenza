"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { KitchenWeeklySchedulePage } from "@/components/kuhinja/KitchenWeeklySchedulePage";
import { canEditKitchenWeeklySchedule, normalizeKitchenStaffRole } from "@/lib/kuhinja-roles";

export default function Page() {
  const { session } = useKuhinjaSessionContext();
  const staffRole = normalizeKitchenStaffRole(session?.role);
  const canEdit = canEditKitchenWeeklySchedule(staffRole);

  return (
    <KuhinjaLayout
      subtitle={
        canEdit
          ? "Planiranje i štampa nedeljnog jelovnika"
          : "Pregled i štampa nedeljnog jelovnika (samo čitanje)"
      }
      title="Nedeljni raspored"
    >
      <KitchenWeeklySchedulePage />
    </KuhinjaLayout>
  );
}
