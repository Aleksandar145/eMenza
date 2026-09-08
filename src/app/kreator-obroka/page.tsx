import { Suspense } from "react";
import { KreatorObrokaPage } from "@/components/kreator-obroka/KreatorObrokaPage";

export default function KreatorObrokaRoute() {
  return (
    <Suspense fallback={null}>
      <KreatorObrokaPage />
    </Suspense>
  );
}
