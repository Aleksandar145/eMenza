"use client";

import { ReferentLayout } from "@/components/layout/ReferentLayout";
import { ReferentDashboard } from "@/components/referent/ReferentDashboard";

export default function ReferentHomePage() {
  return (
    <ReferentLayout
      subtitle="Pregled redova čekanja i aktivnih kartica."
      title="Referent panel"
    >
      <ReferentDashboard />
    </ReferentLayout>
  );
}
