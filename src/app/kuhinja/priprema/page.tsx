"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenPrepPage } from "@/components/kuhinja/KitchenPrepPage";

export default function KuhinjaPripremaRoutePage() {
  return (
    <KuhinjaLayout subtitle="Agregirane količine jela za pripremu." title="Priprema">
      <KitchenPrepPage />
    </KuhinjaLayout>
  );
}
