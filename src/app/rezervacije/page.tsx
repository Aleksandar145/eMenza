import { Suspense } from "react";
import Rezervacije from "@/components/rezervacije";

export default function RezervacijePage() {
  return (
    <Suspense fallback={null}>
      <Rezervacije />
    </Suspense>
  );
}
