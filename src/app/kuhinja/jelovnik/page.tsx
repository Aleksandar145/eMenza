"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenMenuPage } from "@/components/kuhinja/KitchenMenuPage";

export default function KuhinjaJelovnikRoutePage() {
  return (
    <KuhinjaLayout subtitle="Kreirajte i objavite dnevni jelovnik po obroku." title="Jelovnik">
      <KitchenMenuPage />
    </KuhinjaLayout>
  );
}
