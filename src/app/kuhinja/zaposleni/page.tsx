"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenStaffRolesPage } from "@/components/kuhinja/KitchenStaffRolesPage";

export default function KitchenStaffRolesRoutePage() {
  return (
    <KuhinjaLayout subtitle="Dodela uloga kuvar i operater šaltera." title="Uloge zaposlenih">
      <KitchenStaffRolesPage />
    </KuhinjaLayout>
  );
}
