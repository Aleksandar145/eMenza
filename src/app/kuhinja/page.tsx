"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenDashboard } from "@/components/kuhinja/KitchenDashboard";

export default function KuhinjaPage() {
  return (
    <KuhinjaLayout subtitle="Današnji sažetak prijava i operativni pregled." title="Pregled">
      <KitchenDashboard />
    </KuhinjaLayout>
  );
}
