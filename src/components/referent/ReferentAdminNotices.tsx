"use client";

import { useReferentSession } from "@/hooks/useReferentSession";
import { getPublishedReferentNotices } from "@/lib/admin-system-store";
import { StaffAdminNotices } from "@/components/shared/StaffAdminNotices";

export function ReferentAdminNotices() {
  const { session } = useReferentSession();
  const notices = getPublishedReferentNotices(session?.email);
  return <StaffAdminNotices notices={notices} guestKey={session?.email ?? "referent-guest"} />;
}

export default ReferentAdminNotices;
