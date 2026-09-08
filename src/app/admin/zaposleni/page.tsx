"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminStaffPage } from "@/components/admin/AdminStaffPage";

export default function AdminStaffRoutePage() {
  return (
    <AdminLayout subtitle="Upravljanje profilima referenata i zaposlenih." title="Zaposleni">
      <AdminStaffPage />
    </AdminLayout>
  );
}
