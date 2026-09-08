"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { StaffCard, staffInputClass, staffButtonPrimaryClass } from "@/components/staff";
import { parseCardQrPayload } from "@/lib/card-qr";
import { findCardByIdentifier } from "@/lib/referent-cards-mock";
import { loadReferentCardsState } from "@/lib/referent-cards-store";

type CardQrLookupPanelProps = {
  compact?: boolean;
};

export function CardQrLookupPanel({ compact = false }: CardQrLookupPanelProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleLookup() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Unesite sadržaj QR koda ili identifikator kartice.");
      return;
    }

    const cardIdFromQr = parseCardQrPayload(trimmed);
    if (cardIdFromQr) {
      router.push(`/referent/kartice/${encodeURIComponent(cardIdFromQr)}`);
      return;
    }

    const card = findCardByIdentifier(loadReferentCardsState().cards, trimmed);
    if (card) {
      router.push(`/referent/kartice/${encodeURIComponent(card.id)}`);
      return;
    }

    setError("Kartica nije pronađena. Proverite QR sadržaj ili unesite broj kartice / indeks.");
  }

  return (
    <StaffCard
      padding={compact ? "sm" : "md"}
      title="QR / brza pretraga"
      description="Nalepite sadržaj QR koda sa studentske kartice ili unesite broj kartice."
      className={compact ? "p-4" : undefined}
    >
      <div className={`flex flex-col gap-3 ${compact ? "mt-3" : "mt-4"}`}>
        <textarea
          className={`${staffInputClass} min-h-[72px] resize-y`}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
          placeholder="emenza-card:EMZ-CARD-3456"
          value={input}
        />
        <button
          className={staffButtonPrimaryClass}
          onClick={handleLookup}
          type="button"
        >
          <Search aria-hidden="true" size={16} />
          Pretraži
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </StaffCard>
  );
}

export default CardQrLookupPanel;
