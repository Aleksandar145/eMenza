import { Suspense } from "react";
import { ReferentCardsPageContent } from "@/components/referent/ReferentCardsPageContent";

export default function ReferentCardsPage() {
  return (
    <Suspense fallback={null}>
      <ReferentCardsPageContent />
    </Suspense>
  );
}
