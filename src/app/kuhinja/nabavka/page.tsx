"use client";

import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { MagacinNabavkaPage } from "@/components/kuhinja/MagacinNabavkaPage";

export default function KuhinjaNabavkaRoutePage() {
  return (
    <KuhinjaLayout
      subtitle="Upravljanje zalihama namirnica i izveštajima nabavke."
      title="Nabavka i magacin"
    >
      <MagacinNabavkaPage />
    </KuhinjaLayout>
  );
}
