"use client";

import { useEffect, useMemo, useState } from "react";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useStudentCardContext } from "@/hooks/useStudentCard";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useMealReservations } from "@/hooks/useMealReservations";
import { useStudentNotifications } from "@/hooks/useStudentNotifications";
import { useStudentSession } from "@/hooks/useStudentSession";
import { useUserSettings } from "@/hooks/useUserSettings";
import { shouldUseNotificationsApi } from "@/lib/backend/notifications-api";
import { getPublishedStudentNotices } from "@/lib/admin-system-store";
import { buildContextualNotifications } from "@/lib/notification-context";
import {
  getReadNotificationIds,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-read-state";
import { filterNotificationsByPreferences } from "@/lib/notification-preferences";
import {
  buildNotificationsForUser,
  getUnreadCount,
  sortNotificationsByNewest,
  type NotificationItem,
} from "@/lib/obavestenja-mock";
import { getDynamicStudentNotifications } from "@/lib/student-notifications-store";

function mapRemoteNotification(notification: {
  id: string;
  title: string;
  message: string;
  time: string;
  category: NotificationItem["category"];
  read: boolean;
  createdAt: string;
}): NotificationItem {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    time: notification.time,
    category: notification.category,
    read: notification.read,
    sortAt: new Date(notification.createdAt).getTime(),
  };
}

function dedupeNotifications(items: NotificationItem[]): NotificationItem[] {
  const seen = new Set<string>();
  const result: NotificationItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}

function resolveNotificationUserKey(userId?: string, email?: string) {
  return userId ?? email ?? "guest";
}

function isNotificationRead(
  item: NotificationItem,
  persistedReadIds: Set<string>,
  readOverrides: Record<string, boolean>,
) {
  return item.read || persistedReadIds.has(item.id) || Boolean(readOverrides[item.id]);
}

export function useStudentNotificationInbox() {
  const { settings } = useUserSettings();
  const { session } = useStudentSession();
  const todayDateKey = useTodayDateKey();
  useAdminSystem();
  const remote = useStudentNotifications();
  const { reservations } = useMealReservations();
  const { snapshot } = useStudentCardContext();
  const usesBackend = shouldUseNotificationsApi() && remote.usesBackend;
  const userKey = resolveNotificationUserKey(session?.userId, settings.profile.email);
  const [persistedReadIds, setPersistedReadIds] = useState<Set<string>>(() =>
    getReadNotificationIds(userKey),
  );
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersistedReadIds(getReadNotificationIds(userKey));
  }, [userKey]);

  const items = useMemo(() => {
    const published = getPublishedStudentNotices();
    const contextualGenerated = buildContextualNotifications({
      settings: settings.notifications,
      reservations,
      cardStatus: snapshot.effectiveStatus,
      firstName: settings.profile.firstName,
      dateKey: todayDateKey,
      language: settings.app.language,
    });

    let merged: NotificationItem[];

    if (usesBackend) {
      const personal = remote.notifications.map(mapRemoteNotification);
      const contextual = buildNotificationsForUser(
        settings.profile,
        settings.notifications,
        settings.fasting,
        { includeBaseSeeds: false, dateKey: todayDateKey },
      );

      merged = [...published, ...personal, ...contextual, ...contextualGenerated];
    } else {
      const base = buildNotificationsForUser(
        settings.profile,
        settings.notifications,
        settings.fasting,
        { dateKey: todayDateKey },
      );
      const dynamic = getDynamicStudentNotifications(settings.profile.email);
      merged = [...published, ...dynamic, ...base, ...contextualGenerated];
    }

    return filterNotificationsByPreferences(
      sortNotificationsByNewest(dedupeNotifications(merged)),
      settings.notifications,
    );
  }, [
    remote.notifications,
    reservations,
    settings.app.language,
    settings.fasting,
    settings.notifications,
    settings.profile,
    snapshot.effectiveStatus,
    todayDateKey,
    usesBackend,
  ]);

  const displayItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        read: isNotificationRead(item, persistedReadIds, readOverrides),
      })),
    [items, persistedReadIds, readOverrides],
  );

  const unreadCount = getUnreadCount(displayItems);

  async function markAsRead(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item || isNotificationRead(item, persistedReadIds, readOverrides)) {
      return;
    }

    setReadOverrides((current) => ({ ...current, [id]: true }));
    markNotificationRead(userKey, id);
    setPersistedReadIds((current) => new Set([...current, id]));

    if (usesBackend && remote.notifications.some((entry) => entry.id === id)) {
      await remote.markAsRead(id);
    }
  }

  async function markAllAsRead() {
    const ids = displayItems.map((item) => item.id);

    markAllNotificationsRead(userKey, ids);
    setPersistedReadIds((current) => new Set([...current, ...ids]));

    if (usesBackend && remote.notifications.some((entry) => !entry.read)) {
      await remote.markAllAsRead();
    }

    setReadOverrides((current) => {
      const next = { ...current };
      for (const item of displayItems) {
        next[item.id] = true;
      }
      return next;
    });
  }

  return {
    items: displayItems,
    unreadCount,
    markAsRead,
    markAllAsRead,
    usesBackend,
    isPending: usesBackend && remote.isPending,
  };
}
