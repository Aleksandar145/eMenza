"use client";

import { use } from "react";
import { ReferentLayout } from "@/components/layout/ReferentLayout";
import { StudentCardDetailPanel } from "@/components/referent/StudentCardDetailPanel";

type ReferentCardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ReferentCardDetailPage({ params }: ReferentCardDetailPageProps) {
  const { id } = use(params);

  return (
    <ReferentLayout subtitle="Detalji kartice i referent akcije." title="Kartica">
      <StudentCardDetailPanel cardId={decodeURIComponent(id)} />
    </ReferentLayout>
  );
}
