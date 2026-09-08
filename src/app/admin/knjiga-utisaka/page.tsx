"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminFeedbackPage } from "@/components/admin/AdminFeedbackPage";

export default function AdminFeedbackRoutePage() {
  return (
    <AdminLayout subtitle="Pregled i moderacija studentskih utisaka." title="Knjiga utisaka">
      <AdminFeedbackPage />
    </AdminLayout>
  );
}
