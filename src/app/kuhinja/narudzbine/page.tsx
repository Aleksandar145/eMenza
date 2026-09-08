"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenOrdersPage } from "@/components/kuhinja/KitchenOrdersPage";

export default function Page() {
  return (
    <KuhinjaLayout subtitle="Skenirajte karticu ili QR — prikažite rezervaciju i servirajte obrok." title="Šalter">
      <KitchenOrdersPage />
    </KuhinjaLayout>
  );
}
