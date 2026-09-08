import { KuhinjaLayout } from "@/components/layout/KuhinjaLayout";
import { KitchenAdminNotices } from "@/components/kuhinja/KitchenAdminNotices";

export default function Page() {
  return (
    <KuhinjaLayout subtitle="Objave od administracije" title="Obaveštenja">
      <KitchenAdminNotices />
    </KuhinjaLayout>
  );
}
