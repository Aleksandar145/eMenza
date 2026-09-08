"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";

export default function AdminSettingsRoutePage() {
  return (
    <AdminLayout subtitle="Radno vreme, rezervacije, cene i kaucija žetona." title="Podešavanja">
      <AdminSettingsPage />
    </AdminLayout>
  );
}
