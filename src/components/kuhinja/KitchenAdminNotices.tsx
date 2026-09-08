"use client";

import { useKuhinjaSession } from "@/hooks/useKuhinjaSession";
import { getPublishedKitchenNotices } from "@/lib/admin-system-store";
import { StaffAdminNotices } from "@/components/shared/StaffAdminNotices";

export function KitchenAdminNotices() {
  const { session } = useKuhinjaSession();
  const notices = getPublishedKitchenNotices(session?.email);
  return <StaffAdminNotices notices={notices} guestKey={session?.email ?? "kitchen-guest"} />;
}

export default KitchenAdminNotices;
