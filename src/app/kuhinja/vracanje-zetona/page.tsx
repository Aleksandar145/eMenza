import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenZetonReturnPage } from "@/components/kuhinja/KitchenZetonReturnPage";

export default function Page() {
  return (
    <KuhinjaLayout
      subtitle="Skenirajte eZeton QR — potvrdite vraćanje pribora."
      title="Vraćanje žetona"
    >
      <KitchenZetonReturnPage />
    </KuhinjaLayout>
  );
}
