"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminLogsPage } from "@/components/admin/AdminLogsPage";

export default function AdminLogsRoutePage() {
  return (
    <AdminLayout subtitle="Pregled aktivnosti na sistemu." title="Activity Logs">
      <AdminLogsPage />
    </AdminLayout>
  );
}
