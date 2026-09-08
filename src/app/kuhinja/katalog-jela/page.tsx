"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenDishCatalogPage } from "@/components/kuhinja/KitchenDishCatalogPage";

export default function KitchenDishCatalogRoutePage() {
  return (
    <KuhinjaLayout subtitle="Kreirajte i uređujte jela u katalogu." title="Katalog jela">
      <KitchenDishCatalogPage />
    </KuhinjaLayout>
  );
}
