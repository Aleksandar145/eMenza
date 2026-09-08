"use client";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminStudentsPage } from "@/components/admin/AdminStudentsPage";

export default function AdminStudentsRoutePage() {
  return (
    <AdminLayout
      subtitle="Pregled svih studenata i učenika sa pripadajućim karticama."
      title="Studenti i Učenici"
    >
      <AdminStudentsPage />
    </AdminLayout>
  );
}
