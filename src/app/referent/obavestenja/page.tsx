"use client";

import { ReferentLayout } from "@/components/layout/ReferentLayout";
import { ReferentAdminNotices } from "@/components/referent/ReferentAdminNotices";

export default function ReferentObavestenjaPage() {
  return (
    <ReferentLayout subtitle="Obaveštenja objavljena od strane administracije." title="Obaveštenja">
      <ReferentAdminNotices />
    </ReferentLayout>
  );
}
