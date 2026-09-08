"use client";

import { useSearchParams } from "next/navigation";
import { ReferentLayout } from "@/components/layout/ReferentLayout";
import { CardSearchPanel } from "@/components/referent/CardSearchPanel";
import type { CardStatus } from "@/lib/referent-cards-mock";

export function ReferentCardsPageContent() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const initialStatus =
    statusParam === "active" ||
    statusParam === "pending_verification" ||
    statusParam === "blocked" ||
    statusParam === "expired"
      ? (statusParam as CardStatus)
      : "all";

  return (
    <ReferentLayout subtitle="Pretražite i filtrirajte studentske kartice." title="Kartice">
      <CardSearchPanel initialStatus={initialStatus} />
    </ReferentLayout>
  );
}

export default ReferentCardsPageContent;
