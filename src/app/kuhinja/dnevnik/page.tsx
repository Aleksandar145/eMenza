"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenActivityLogsPage } from "@/components/kuhinja/KitchenActivityLogsPage";

export default function KitchenDiaryRoutePage() {
  return (
    <KuhinjaLayout subtitle="Pregled aktivnosti u kuhinji — spiskovi, jela i statusi naloga." title="Dnevnik">
      <KitchenActivityLogsPage />
    </KuhinjaLayout>
  );
}
