"use client";

import { ReferentLayout } from "@/components/layout/ReferentLayout";
import { ReferentHistoryPage } from "@/components/referent/ReferentHistoryPage";

export default function ReferentHistoryRoutePage() {
  return (
    <ReferentLayout
      subtitle="Hronološka istorija dopuna, aktivacija, blokada i produženja po periodu."
      title="Istorija"
    >
      <ReferentHistoryPage />
    </ReferentLayout>
  );
}
