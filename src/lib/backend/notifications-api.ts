import type { StudentNotificationRecord } from "@/server/repositories/notifications";
import { apiGetData, apiPatch } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

export function shouldUseNotificationsApi() {
  return isClientBackendEnabled();
}

let inFlightNotifications: Promise<StudentNotificationRecord[]> | null = null;

export async function fetchMyNotificationsFromApi() {
  if (inFlightNotifications) {
    return inFlightNotifications;
  }

  inFlightNotifications = apiGetData<{ notifications: StudentNotificationRecord[] }>("/api/notifications")
    .then((data) => data.notifications)
    .finally(() => {
      inFlightNotifications = null;
    });

  return inFlightNotifications;
}

export async function markNotificationReadViaApi(id: string) {
  const data = await apiPatch<{ notification: StudentNotificationRecord }>("/api/notifications", {
    id,
  });
  return data.notification;
}

export async function markAllNotificationsReadViaApi() {
  const data = await apiPatch<{ notifications: StudentNotificationRecord[] }>("/api/notifications", {
    all: true,
  });
  return data.notifications;
}
