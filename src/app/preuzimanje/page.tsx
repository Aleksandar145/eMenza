import { Suspense } from "react";
import { PreuzimanjePage } from "@/components/preuzimanje/PreuzimanjePage";

export default function Page() {
  return (
    <Suspense>
      <PreuzimanjePage />
    </Suspense>
  );
}
