"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminNoticesPage } from "@/components/admin/AdminNoticesPage";

export default function AdminNoticesRoutePage() {
  return (
    <AdminLayout subtitle="Objavljivanje obaveštenja studentima i referentima." title="Obaveštenja">
      <AdminNoticesPage />
    </AdminLayout>
  );
}
