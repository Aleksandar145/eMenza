"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminDishCatalogPage } from "@/components/admin/AdminDishCatalogPage";

export default function AdminKatalogJelaRoutePage() {
  return (
    <AdminLayout subtitle="Upravljanje šifarnikom jela — ime, cena, slika, kategorija." title="Katalog jela">
      <AdminDishCatalogPage />
    </AdminLayout>
  );
}
