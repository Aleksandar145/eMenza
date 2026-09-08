"use client";

import { ReferentLayout } from "@/components/layout/ReferentLayout";
import { ActivationQueue } from "@/components/referent/ActivationQueue";

export default function ReferentActivationPage() {
  return (
    <ReferentLayout
      subtitle="Verifikujte fizičku karticu i aktivirajte studentski nalog."
      title="Aktivacija kartica"
    >
      <ActivationQueue />
    </ReferentLayout>
  );
}
