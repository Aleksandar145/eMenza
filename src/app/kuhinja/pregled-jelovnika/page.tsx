import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenMenuOverviewPage } from "@/components/kuhinja/KitchenMenuOverviewPage";

export default function Page() {
  return (
    <KuhinjaLayout subtitle="Pregled jelovnika" title="Pregled jelovnika">
      <KitchenMenuOverviewPage />
    </KuhinjaLayout>
  );
}
