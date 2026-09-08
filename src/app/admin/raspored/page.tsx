"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminSchedulePage } from "@/components/admin/AdminSchedulePage";

export default function AdminScheduleRoutePage() {
  return (
    <AdminLayout subtitle="Pregled statusa menija po danima." title="Pregled rasporeda">
      <AdminSchedulePage />
    </AdminLayout>
  );
}
