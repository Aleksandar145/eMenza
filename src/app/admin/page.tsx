"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminHomePage() {
  return (
    <AdminLayout subtitle="Pregled sistema i brzi pristup modulima." title="Admin panel">
      <AdminDashboard />
    </AdminLayout>
  );
}
