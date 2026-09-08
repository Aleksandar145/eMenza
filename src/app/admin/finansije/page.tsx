"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminFinansijePage } from "@/components/admin/AdminFinansijePage";

export default function AdminFinansije() {
  return (
    <AdminLayout subtitle="Finansijski pregled i izveštaji." title="Finansije">
      <AdminFinansijePage />
    </AdminLayout>
  );
}
