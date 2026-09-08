"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminMonitoringPage } from "@/components/admin/AdminMonitoringPage";

export default function AdminMonitoringRoutePage() {
  return (
    <AdminLayout
      subtitle="Pregled prometa i potrošnje po kategorijama."
      title="Monitoring"
    >
      <div className="-mt-1">
        <AdminMonitoringPage />
      </div>
    </AdminLayout>
  );
}
