"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CardQrLookupPanel } from "@/components/referent/CardQrLookupPanel";
import { CardStatusBadge } from "@/components/referent/CardStatusBadge";
import {
  StaffCard,
  staffInputClass,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
} from "@/components/staff";
import { cardStatusLabels, resolveEffectiveCardStatus, type CardStatus } from "@/lib/referent-cards-mock";
import { searchCards } from "@/lib/referent-cards-store";

const filterOptions: { id: CardStatus | "all"; label: string }[] = [
  { id: "all", label: "Sve" },
  { id: "pending_verification", label: cardStatusLabels.pending_verification },
  { id: "active", label: cardStatusLabels.active },
  { id: "blocked", label: cardStatusLabels.blocked },
  { id: "expired", label: cardStatusLabels.expired },
];

type CardSearchPanelProps = {
  initialQuery?: string;
  initialStatus?: CardStatus | "all";
};

export function CardSearchPanel({
  initialQuery = "",
  initialStatus = "all",
}: CardSearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<CardStatus | "all">(initialStatus);

  const results = useMemo(
    () => searchCards(query, statusFilter),
    [query, statusFilter],
  );

  return (
    <div className="space-y-4">
      <CardQrLookupPanel />

      <StaffCard padding="md">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={18}
          />
          <input
            className={`${staffInputClass} pl-11`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pretraži po imenu, indeksu, broju kartice..."
            type="search"
            value={query}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = statusFilter === option.id;

            return (
              <button
                aria-pressed={isActive}
                className={isActive ? staffButtonPrimaryClass : staffButtonSecondaryClass}
                key={option.id}
                onClick={() => setStatusFilter(option.id)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </StaffCard>

      <ul className="space-y-2">
        {results.map((card) => {
          const effectiveStatus = resolveEffectiveCardStatus(card);

          return (
            <li key={card.id}>
              <Link href={`/referent/kartice/${encodeURIComponent(card.id)}`}>
                <StaffCard padding="sm" className="!p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{card.studentName}</span>
                        <CardStatusBadge status={effectiveStatus} />
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{card.email}</p>
                    </div>
                    <div className="text-sm tabular-nums text-[var(--text-secondary)]">
                      <span className="font-mono">{card.cardNumber}</span>
                      <span className="mx-2 text-[var(--text-muted)]">·</span>
                      <span className="font-semibold text-[var(--brand-primary)]">
                        {card.balanceRsd.toLocaleString("sr-RS")} RSD
                      </span>
                    </div>
                  </div>
                </StaffCard>
              </Link>
            </li>
          );
        })}
      </ul>

      {results.length === 0 ? (
        <StaffCard padding="md">
          <p className="text-center text-sm text-[var(--text-secondary)]">Nema kartica za zadati filter.</p>
        </StaffCard>
      ) : null}
    </div>
  );
}

export default CardSearchPanel;
