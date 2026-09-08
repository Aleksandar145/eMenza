import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenFeedbackPage } from "@/components/kuhinja/KitchenFeedbackPage";

export default function Page() {
  return (
    <KuhinjaLayout subtitle="Utisci studenata o menzi" title="Knjiga utisaka">
      <KitchenFeedbackPage />
    </KuhinjaLayout>
  );
}
