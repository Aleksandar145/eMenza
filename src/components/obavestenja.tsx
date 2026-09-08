"use client";

import AppLayout from "@/components/layout/AppLayout";
import { NotificationList } from "@/components/obavestenja/NotificationList";

export function Obavestenja() {
  return (
    <AppLayout
      subtitle="Rezervacije, uplate i važne informacije sa restorana."
      title="Obaveštenja"
    >
      <div className="mx-auto max-w-3xl">
        <NotificationList />
      </div>
    </AppLayout>
  );
}

export default Obavestenja;
