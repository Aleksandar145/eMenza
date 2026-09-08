"use client";

import { AiPreporukaContent } from "@/components/ai-preporuka/AiPreporukaContent";
import { AiPreporukaShell } from "@/components/ai-preporuka/AiPreporukaShell";
import { MealBookingLockedSection } from "@/components/shared/MealBookingLockedSection";

export function AiPreporukaPage() {
  return (
    <AiPreporukaShell
      backHref="/"
      backLabel="Nazad na početnu"
      showBackLink
      subtitle="Odaberite omiljene namirnice za personalizovanu preporuku"
      title="AI preporuka"
    >
      <MealBookingLockedSection>
        <AiPreporukaContent variant="portal" />
      </MealBookingLockedSection>
    </AiPreporukaShell>
  );
}

export default AiPreporukaPage;
