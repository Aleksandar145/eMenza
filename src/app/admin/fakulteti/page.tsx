"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminFacultiesPage } from "@/components/admin/AdminFacultiesPage";

export default function AdminFacultiesRoutePage() {
  return (
    <AdminLayout
      subtitle="Upravljanje fakultetima i školama za studentsku registraciju."
      title="Fakulteti i škole"
    >
      <AdminFacultiesPage />
    </AdminLayout>
  );
}
